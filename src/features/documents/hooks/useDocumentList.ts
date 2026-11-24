import { styleExcelWorksheet } from "../../../helpers/excel-styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../helpers/api-url";
import { useColumnWidths } from "../../../helpers/use-column-widths";
import { readUiPreference, writeUiPreference } from "../../../helpers/ui-preferences";
import { restoreDocumentListState } from "../services/list-state";
import { ColumnWidths, Document, Notification, TipoDocumento } from "../types/list.types";
import { DOCUMENTS_FLASH_NOTIFICATION_KEY } from "../services/document.utils";
import { downloadBlob } from "../../../helpers/download-blob";
import LogoDocuware from "../../../assets/images/LogoDocuware.png";

type ImportSummary = { documents_created?: number; documents_updated?: number; details_created?: number; duplicates_skipped?: number; };
type ExtractDocumentsResultPayload = { message?: string; items?: unknown[]; import_summary?: ImportSummary | null; };
type ExtractDocumentsJobData = { job_id?: string; status?: string; message?: string; result?: ExtractDocumentsResultPayload | null; };
type ExtractDocumentsJobResponse = { success?: boolean; message?: string; data?: ExtractDocumentsJobData | null; };

const EXTRACT_POLL_INTERVAL_MS = 3000;
const EXTRACT_MAX_POLLS = 40;
const EXTRACT_MAX_TRANSIENT_JOB_ERRORS = 8;

const normalizeAssociatedNo = (value: string) => value.trim().toUpperCase();

const getAuthHeaders = (): Record<string, string> => {
  try {
    const authUser = sessionStorage.getItem("authUser");
    const parsedUser = authUser ? JSON.parse(authUser) : null;
    const token = parsedUser?.token || parsedUser?.data?.token;
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  } catch {
    return { "Content-Type": "application/json" };
  }
};

export const getDocumentAssociatedNo = (document: Document) =>
  JSON.stringify([document.suppliernumber.trim(),
    typeof document.documenttype === "object" ? document.documenttype?.tipoid : document.documenttype,
    normalizeAssociatedNo(
    [document.documentserial, document.documentnumber].filter(Boolean).join("-")
  )]);

const buildImportSummaryMessage = (baseMessage: string, summary: ImportSummary | null | undefined, t: (key: string) => string) => {
  if (!summary) return baseMessage;
  return `${baseMessage}. Creados: ${Number(summary.documents_created ?? 0)}, Duplicados omitidos: ${Number(summary.duplicates_skipped ?? 0)}, Detalles: ${Number(summary.details_created ?? 0)}`;
};

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const isTransientExtractJobError = (responseStatus: number, payload: ExtractDocumentsJobResponse | null) => {
  const normalizedMessage = String(payload?.message ?? "").trim().toLowerCase();
  return responseStatus === 404 || normalizedMessage.includes("trabajo sunat no encontrado") || normalizedMessage.includes("job not found");
};

export const useDocumentList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotateLeft = () => setRotation((prev) => prev - 90);
  const rotateRight = () => setRotation((prev) => prev + 90);
  const [savedListState] = useState(() => restoreDocumentListState(readUiPreference("documents:list-state")));
  const [searchTerm, setSearchTerm] = useState(savedListState.searchTerm);
  const [statusFilter, setStatusFilter] = useState(savedListState.statusFilter);
  const [orderFilter, setOrderFilter] = useState(savedListState.orderFilter);
  const [dateRange, setDateRange] = useState<Date[]>(savedListState.dateRange);
  const [deleteModal, setDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(savedListState.currentPage);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [approvedOrderDocumentNos, setApprovedOrderDocumentNos] = useState<Set<string>>(new Set());

  useEffect(() => {
    writeUiPreference("documents:list-state", {
      searchTerm, statusFilter, orderFilter, dateRange: dateRange.map((date) => date.toISOString()), currentPage,
    });
  }, [searchTerm, statusFilter, orderFilter, dateRange, currentPage]);

  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const requestVersion = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const hasLoaded = useRef(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);
  const itemsPerPage = 20;

  const [columnWidths, setColumnWidths] = useColumnWidths<ColumnWidths>("documents", {
    id: 80, serie: 100, numero: 100, ruc: 130, razon: 200, tipo: 150, driver: 120, fecha: 130, moneda: 100, subtotal: 110, igv: 100, total: 120, estado: 120, orden: 180, acciones: 120,
  });

  const addNotification = (type: Notification["type"], message: Notification["message"]) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  };

  useEffect(() => {
    const flashNotification = sessionStorage.getItem(DOCUMENTS_FLASH_NOTIFICATION_KEY);
    if (!flashNotification) return;
    try {
      const parsedNotification = JSON.parse(flashNotification) as { type?: Notification["type"]; message?: string; };
      if (parsedNotification.type && parsedNotification.message) {
        setNotifications((prev) => [...prev, { id: Date.now(), type: parsedNotification.type as Notification["type"], message: parsedNotification.message }]);
      }
    } catch { } finally {
      sessionStorage.removeItem(DOCUMENTS_FLASH_NOTIFICATION_KEY);
    }
  }, []);

  const startKey = dateRange[0] ? moment(dateRange[0]).format("YYYY-MM-DD") : "";
  const endKey = dateRange[1] ? moment(dateRange[1]).format("YYYY-MM-DD") : "";
  const filterQuery = useMemo(() => new URLSearchParams({search: debouncedSearch, status: statusFilter, order: orderFilter, start_date: startKey, end_date: endKey}).toString(), [debouncedSearch, statusFilter, orderFilter, startKey, endKey]);
  const fetchInitialData = useCallback(async (showLoader = true) => {
    const version = ++requestVersion.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl(`documents/?${filterQuery}&page=${currentPage}&page_size=${itemsPerPage}`), { headers: getAuthHeaders(), signal: controller.signal });
      const payload = await response.json();
      if (controller.signal.aborted || version !== requestVersion.current) return;
      if (!response.ok || !payload.success || !Array.isArray(payload.data) || !payload.pagination) throw new Error(payload.message || t("Error getting documents"));
      setDocuments(payload.data);
      setTotalCount(payload.pagination.count);
      setCurrentPage(payload.pagination.page);
      setApprovedOrderDocumentNos(new Set((payload.data as Document[]).filter((doc) => doc.hasActiveOrder).map(getDocumentAssociatedNo)));
    } catch (failure: unknown) {
      if (controller.signal.aborted || version !== requestVersion.current) return;
      setError(failure instanceof Error ? failure.message : t("Unexpected server response"));
    } finally {
      if (!controller.signal.aborted && version === requestVersion.current) {
        hasLoaded.current = true;
        if (showLoader) setLoading(false);
      }
    }
  }, [t, filterQuery, currentPage]);
  useEffect(() => {
    void fetchInitialData();
    const controller = activeRequest.current;
    return () => controller?.abort();
  }, [fetchInitialData]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(buildApiUrl("tipo-documento/"), { headers: getAuthHeaders(), signal: controller.signal })
      .then((response) => response.json()).then((payload) => { if (!controller.signal.aborted && payload.success) setTiposDocumento(payload.data); }).catch(() => {});
    return () => controller.abort();
  }, []);

  const handleResize = (column: keyof ColumnWidths, newWidth: number) => {
    setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
  };

  const getTipoDocumentoNombre = (documentType: Document["documenttype"]): string => {
    if (typeof documentType === "number") {
      const tipo = tiposDocumento.find((item) => item.tipoid === documentType);
      return tipo ? tipo.tipo : String(documentType);
    }
    if (typeof documentType === "object" && documentType !== null) return documentType.tipo;
    return t("Unknown");
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedDocuments = documents;

  const handleDelete = (documentid: number) => {
    setDocumentToDelete(documentid);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    try {
      const response = await fetch(buildApiUrl("document-delete/"), {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ documentid: documentToDelete }),
      });
      const payload = await response.json();
      if (payload.success || response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.documentid !== documentToDelete));
        addNotification("success", t("Document deleted successfully"));
        setDeleteModal(false);
        setDocumentToDelete(null);
        await fetchInitialData(false);
      } else {
        addNotification("danger", payload.message || t("Error deleting the document"));
      }
    } catch (deleteError) {
      addNotification("danger", t("Error during the deletion process"));
    }
  };

  const handleViewDocument = (doc: Document) => {
    setRotation(0);
    setSelectedDoc(doc);
  };

  const handleClosePreview = () => {
    setRotation(0);
    setSelectedDoc(null);
  };

  const handleOpenOrderC = (doc: Document) => {
    if (doc.hasActiveOrder) {
      addNotification("warning", `Este documento ya tiene una ${doc.activeOrder?.type || "OC/OS"} vigente: ${doc.activeOrder?.orderNo || "pendiente de correlativo"}.`);
      return;
    }
    navigate(`/documents/order-c/${doc.documentid}`, { state: { document: doc } });
  };

  const handleEditClick = (doc: Document) => {
    if (doc.hasActiveOrder || doc.activeOrder ||
        (doc.hasActiveOrder == null && approvedOrderDocumentNos.has(getDocumentAssociatedNo(doc)))) {
      addNotification("warning", "Este comprobante tiene una OC/OS vigente y no se puede editar.");
      return;
    }
    navigate(`/documents/edit/${doc.documentid}`, { state: { document: doc } });
  };

  const handleExtract = async ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null; }) => {
    if (!startDate || !endDate) {
      addNotification("warning", t("Please select start and end dates."));
      return false;
    }
    const queryParams = new URLSearchParams({ fecha_inicio: moment(startDate).format("YYYY-MM-DD"), fecha_fin: moment(endDate).format("YYYY-MM-DD"), async: "true" });
    try {
      const response = await fetch(`${buildApiUrl("apisunat/GetDocumentosSunat/")}?${queryParams.toString()}`, { cache: "no-store", headers: getAuthHeaders() });
      const payload = (await response.json().catch(() => null)) as ExtractDocumentsJobResponse | null;

      if (!response.ok || !payload?.success || !payload?.data?.job_id) {
        addNotification("danger", payload?.message || t("Unexpected server response"));
        return false;
      }

      const resolveCompletedJob = async (jobPayload: ExtractDocumentsJobResponse) => {
        const jobData = jobPayload.data;
        const jobResult = jobData?.result;
        const successMessage = buildImportSummaryMessage(
          jobResult?.message || jobData?.message || jobPayload.message || t("Documents extracted successfully"),
          jobResult?.import_summary ?? null, t
        );
        addNotification("success", successMessage);
        await fetchInitialData(false);
        setCurrentPage(1);
        return true;
      };

      const initialStatus = String(payload.data.status ?? "").trim().toLowerCase();
      if (initialStatus === "completed") return resolveCompletedJob(payload);
      if (["failed", "error", "cancelled", "canceled"].includes(initialStatus)) {
        addNotification("danger", payload.data.message || payload.message || t("Unexpected server response"));
        return false;
      }

      const jobId = payload.data.job_id;
      let transientJobErrors = 0;

      for (let attempt = 0; attempt < EXTRACT_MAX_POLLS; attempt += 1) {
        await wait(EXTRACT_POLL_INTERVAL_MS);
        const jobResponse = await fetch(buildApiUrl(`apisunat/GetDocumentosSunat/jobs/${jobId}/`), { cache: "no-store", headers: getAuthHeaders() });
        const jobPayload = (await jobResponse.json().catch(() => null)) as ExtractDocumentsJobResponse | null;

        if (!jobResponse.ok || !jobPayload?.success || !jobPayload?.data) {
          if (isTransientExtractJobError(jobResponse.status, jobPayload) && transientJobErrors < EXTRACT_MAX_TRANSIENT_JOB_ERRORS) {
             transientJobErrors += 1; continue;
          }
          addNotification("danger", jobPayload?.message || t("Unexpected server response"));
          return false;
        }

        transientJobErrors = 0;
        const jobStatus = String(jobPayload.data.status ?? "").trim().toLowerCase();
        if (jobStatus === "completed") return resolveCompletedJob(jobPayload);
        if (["failed", "error", "cancelled", "canceled"].includes(jobStatus)) {
          addNotification("danger", jobPayload.data.message || jobPayload.message || t("Unexpected server response"));
          return false;
        }
      }

      addNotification("warning", t("The extraction is still processing. Please try again in a few moments."));
      return false;
    } catch (extractError) {
      addNotification("danger", t("Unexpected server response"));
      return false;
    }
  };

  const exportToExcel = async () => {
    try {
      const query = new URLSearchParams(filterQuery);
      query.set("search", searchTerm);
      const response = await fetch(buildApiUrl(`documents/?${query}`), { headers: getAuthHeaders() });
      const payload = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) throw new Error("Export failed");
      const filteredDocuments = payload.data as Document[];
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Documentos");

      try {
        const response = await fetch(LogoDocuware);
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({ buffer: imageBuffer, extension: "png" });
        worksheet.addImage(imageId, "B1:D2");
      } catch {}

      worksheet.mergeCells("E1:M2");
      const titleCell = worksheet.getCell("E1");
      titleCell.value = "REPORTE DE DOCUMENTOS";
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.font = { size: 14, bold: true };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } };

      ["A1", "A2", "B1", "C1", "D1", "B2", "C2", "D2"].forEach((cell) => {
        worksheet.getCell(cell).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } };
      });

      const headers = ["ID", "Serie", "Número", "RUC", "Razón Social", "Tipo Documento", "Comprador", "Fecha Emisión", "Moneda", "Sub Total", "IGV", "Total", "Estado"];

      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      filteredDocuments.forEach((doc) => {
        const row = worksheet.addRow([
          doc.documentid, doc.documentserial, doc.documentnumber, doc.suppliernumber, doc.suppliername,
          getTipoDocumentoNombre(doc.documenttype || { tipoid: 0, tipo: "" }),
          doc.driver ?? "", moment(doc.documentdate).format("DD/MM/YYYY"), doc.currency?.trim().toUpperCase() || "",
          parseFloat(doc.amount), parseFloat(doc.taxamount), parseFloat(doc.totalamount),
          doc.status ? "Activo" : "Pendiente",
        ]);

        row.eachCell((cell, columnNumber) => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          if (columnNumber === 13) cell.font = { color: { argb: doc.status ? "008000" : "FF0000" }, bold: true };
          if ([10, 11, 12].includes(columnNumber)) { cell.alignment = { horizontal: "right" }; cell.numFmt = "#,##0.00"; }
        });
      });

      worksheet.columns = [
        { width: 6 }, { width: 10 }, { width: 12 }, { width: 15 }, { width: 35 }, { width: 20 },
        { width: 15 }, { width: 15 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 },
      ];

      styleExcelWorksheet(worksheet, { headerRow: 3, widths: [12, 14, 18, 19, 45, 28, 30, 20, 15, 22, 22, 22, 22], statusColumn: 13 });
      const buffer = await workbook.xlsx.writeBuffer();
      await downloadBlob(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Documentos_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
      );
    } catch (exportError) {
      addNotification("danger", t("Could not export Excel file"));
    }
  };

  return {
    documents, loading, initialLoading: loading && !hasLoaded.current, error, selectedDoc, rotation, searchTerm, statusFilter, orderFilter, setOrderFilter: (value: string) => { setOrderFilter(value); setCurrentPage(1); }, dateRange,
    deleteModal, documentToDelete, currentPage, notifications, approvedOrderDocumentNos, columnWidths,
    setSearchTerm: (value: string) => { setSearchTerm(value); setCurrentPage(1); },
    setStatusFilter: (value: string) => { setStatusFilter(value); setCurrentPage(1); },
    setDateRange: (value: Date[]) => { setDateRange(value); setCurrentPage(1); }, setNotifications, setDeleteModal, setDocumentToDelete, setCurrentPage,
    paginatedDocuments, totalPages, itemsPerPage, filteredDocumentsCount: totalCount,
    handleResize, handleDelete, confirmDelete, handleViewDocument, handleClosePreview, handleOpenOrderC,
    handleEditClick, handleExtract, exportToExcel, rotateLeft, rotateRight, getTipoDocumentoNombre,
    refreshDocuments: () => void fetchInitialData(false),
  };
};
