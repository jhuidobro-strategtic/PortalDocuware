import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import "./Documents.css";
import LogoDocuware from "../../../../assets/images/LogoDocuware.png";
import FloatingAlerts from "../../../../components/common/FloatingAlerts";
import Notifications from "./components/Notifications";
import DocumentFilters from "./components/DocumentFilters";
import DocumentTable from "./components/DocumentTable";
import DocumentPreview from "./components/DocumentPreview";
import DeleteDocumentModal from "./components/DeleteDocumentModal";
import { buildApiUrl } from "../../../../helpers/api-url";
import { ColumnWidths, Document, Notification, TipoDocumento } from "./types";
import {
  DOCUMENTS_FLASH_NOTIFICATION_KEY,
  getDownloadUrl,
  getPreviewUrl,
} from "./document-utils";
import { intelligentSearch } from "../../../../helpers/search-utils";
import { downloadBlob } from "../../../../helpers/download-blob";

type PurchaseOrderStateValue =
  | number
  | {
    id?: number;
    descripcion?: string;
  };

type PurchaseOrderReference = {
  documentAssociatedNo?: string;
  purchaseState?: PurchaseOrderStateValue;
};

type ImportSummary = {
  documents_created?: number;
  documents_updated?: number;
  details_created?: number;
};

type ExtractDocumentsResultPayload = {
  message?: string;
  items?: unknown[];
  import_summary?: ImportSummary | null;
};

type ExtractDocumentsJobData = {
  job_id?: string;
  status?: string;
  message?: string;
  result?: ExtractDocumentsResultPayload | null;
};

type ExtractDocumentsJobResponse = {
  success?: boolean;
  message?: string;
  data?: ExtractDocumentsJobData | null;
};

const APPROVED_PURCHASE_STATE_ID = 12;
const EXTRACT_POLL_INTERVAL_MS = 3000;
const EXTRACT_MAX_POLLS = 40;
const EXTRACT_MAX_TRANSIENT_JOB_ERRORS = 8;

const normalizeAssociatedNo = (value: string) => value.trim().toUpperCase();

const getDocumentAssociatedNo = (document: Document) =>
  normalizeAssociatedNo(
    [document.documentserial, document.documentnumber].filter(Boolean).join("-")
  );

const isApprovedPurchaseState = (purchaseState: PurchaseOrderStateValue) => {
  if (typeof purchaseState === "number") {
    return purchaseState === APPROVED_PURCHASE_STATE_ID;
  }

  const stateId = Number(purchaseState?.id ?? 0);
  const stateDescription = String(purchaseState?.descripcion ?? "")
    .trim()
    .toUpperCase();

  return (
    stateId === APPROVED_PURCHASE_STATE_ID ||
    stateDescription.includes("APROBADO")
  );
};

const buildImportSummaryMessage = (
  baseMessage: string,
  summary: ImportSummary | null | undefined,
  t: (key: string) => string
) => {
  if (!summary) {
    return baseMessage;
  }

  return (
    <div>
      <div>{baseMessage}</div>
      <div className="mt-2 small">
        <div>
          {t("Documents created")}: {Number(summary.documents_created ?? 0)}
        </div>
        <div>
          {t("Documents updated")}: {Number(summary.documents_updated ?? 0)}
        </div>
        <div>
          {t("Details created")}: {Number(summary.details_created ?? 0)}
        </div>
      </div>
    </div>
  );
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const isTransientExtractJobError = (
  responseStatus: number,
  payload: ExtractDocumentsJobResponse | null
) => {
  const normalizedMessage = String(payload?.message ?? "")
    .trim()
    .toLowerCase();

  return (
    responseStatus === 404 ||
    normalizedMessage.includes("trabajo sunat no encontrado") ||
    normalizedMessage.includes("job not found")
  );
};

const DocumentList: React.FC = () => {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [approvedOrderDocumentNos, setApprovedOrderDocumentNos] = useState<
    Set<string>
  >(new Set());

  const itemsPerPage = 20;
  const startDate = dateRange[0];
  const endDate = dateRange[1];

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    id: 80,
    serie: 100,
    numero: 100,
    ruc: 130,
    razon: 200,
    tipo: 150,
    driver: 120,
    fecha: 130,
    moneda: 100,
    subtotal: 110,
    igv: 100,
    total: 120,
    estado: 120,
    acciones: 120,
  });

  const addNotification = (
    type: Notification["type"],
    message: Notification["message"]
  ) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  };

  useEffect(() => {
    const flashNotification = sessionStorage.getItem(
      DOCUMENTS_FLASH_NOTIFICATION_KEY
    );

    if (!flashNotification) {
      return;
    }

    try {
      const parsedNotification = JSON.parse(flashNotification) as {
        type?: Notification["type"];
        message?: string;
      };

      if (parsedNotification.type && parsedNotification.message) {
        const notificationType = parsedNotification.type;
        const notificationMessage = parsedNotification.message;

        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: notificationType,
            message: notificationMessage,
          },
        ]);
      }
    } catch {
      // Ignore invalid flash payload.
    } finally {
      sessionStorage.removeItem(DOCUMENTS_FLASH_NOTIFICATION_KEY);
    }
  }, []);

  const fetchInitialData = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      try {
        const [
          documentsResponse,
          documentTypesResponse,
          purchaseOrdersResponse,
        ] = await Promise.all([
          fetch(buildApiUrl("documents")),
          fetch(buildApiUrl("tipo-documento")),
          fetch(buildApiUrl("purchase-orders/")),
        ]);

        const documentsPayload = await documentsResponse.json();
        const documentTypesPayload = await documentTypesResponse.json();
        const purchaseOrdersPayload = await purchaseOrdersResponse
          .json()
          .catch(() => null);

        if (documentsPayload.success) {
          setDocuments(documentsPayload.data);
        } else {
          throw new Error(documentsPayload.message || t("Error getting documents"));
        }

        if (documentTypesPayload.success) {
          setTiposDocumento(documentTypesPayload.data);
        }

        if (
          purchaseOrdersResponse.ok &&
          purchaseOrdersPayload?.success &&
          Array.isArray(purchaseOrdersPayload?.data)
        ) {
          const approvedOrders = new Set(
            (purchaseOrdersPayload.data as PurchaseOrderReference[])
              .filter((purchaseOrder) =>
                isApprovedPurchaseState(purchaseOrder.purchaseState ?? 0)
              )
              .map((purchaseOrder) =>
                normalizeAssociatedNo(
                  String(purchaseOrder.documentAssociatedNo ?? "")
                )
              )
              .filter(Boolean)
          );

          setApprovedOrderDocumentNos(approvedOrders);
        } else {
          setApprovedOrderDocumentNos(new Set());
        }
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : t("Unexpected server response");
        setError(message);
        throw fetchError;
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [t]
  );

  useEffect(() => {
    fetchInitialData().catch(() => {
      // Error state is already handled inside fetchInitialData.
    });
  }, [fetchInitialData]);

  const handleResize = (column: keyof ColumnWidths, newWidth: number) => {
    setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
  };

  const getTipoDocumentoNombre = (
    documentType: Document["documenttype"]
  ): string => {
    if (typeof documentType === "number") {
      const tipo = tiposDocumento.find((item) => item.tipoid === documentType);
      return tipo ? tipo.tipo : String(documentType);
    }

    if (typeof documentType === "object" && documentType !== null) {
      return documentType.tipo;
    }

    return t("Unknown");
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = intelligentSearch(doc, searchTerm);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && doc.status) ||
      (statusFilter === "pending" && !doc.status);

    let matchesDate = true;
    if (startDate || endDate) {
      const documentDate = moment(doc.documentdate, ["YYYY/MM/DD", "YYYY-MM-DD"]);
      const start = startDate ? moment(startDate).startOf("day") : null;
      const end = endDate ? moment(endDate).endOf("day") : null;

      matchesDate =
        (!start || documentDate.isSameOrAfter(start)) &&
        (!end || documentDate.isSameOrBefore(end));
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = (documentid: number) => {
    setDocumentToDelete(documentid);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl("document-delete/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentid: documentToDelete,
        }),
      });

      const payload = await response.json();

      if (payload.success || response.ok) {
        setDocuments((prev) =>
          prev.filter((doc) => doc.documentid !== documentToDelete)
        );
        addNotification("success", t("Document deleted successfully"));
        setDeleteModal(false);
        setDocumentToDelete(null);
      } else {
        addNotification(
          "danger",
          payload.message || t("Error deleting the document")
        );
      }
    } catch (deleteError) {
      console.error("Error al eliminar documento:", deleteError);
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
    navigate(`/documents/order-c/${doc.documentid}`, {
      state: { document: doc },
    });
  };

  const handleEditClick = (doc: Document) => {
    navigate(`/documents/edit/${doc.documentid}`, {
      state: { document: doc },
    });
  };

  const handleExtract = async ({
    startDate,
    endDate,
  }: {
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    if (!startDate || !endDate) {
      addNotification("warning", t("Please select start and end dates."));
      return false;
    }

    const queryParams = new URLSearchParams({
      fecha_inicio: moment(startDate).format("YYYY-MM-DD"),
      fecha_fin: moment(endDate).format("YYYY-MM-DD"),
      async: "true",
    });

    try {
      const response = await fetch(
        `${buildApiUrl("apisunat/GetDocumentosSunat/")}?${queryParams.toString()}`,
        {
          cache: "no-store",
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | ExtractDocumentsJobResponse
        | null;

      if (!response.ok || !payload?.success || !payload?.data?.job_id) {
        addNotification(
          "danger",
          payload?.message || t("Unexpected server response")
        );
        return false;
      }

      const resolveCompletedJob = async (
        jobPayload: ExtractDocumentsJobResponse
      ) => {
        const jobData = jobPayload.data;
        const jobResult = jobData?.result;
        const importSummary = jobResult?.import_summary ?? null;
        const resultItems = Array.isArray(jobResult?.items)
          ? jobResult.items
          : [];

        const successMessage = buildImportSummaryMessage(
          jobResult?.message ||
            jobData?.message ||
            jobPayload.message ||
            t("Documents extracted successfully"),
          importSummary,
          t
        );

        addNotification("success", successMessage);

        if (resultItems.length === 0 && !importSummary) {
          await fetchInitialData(false);
          setCurrentPage(1);
          return true;
        }

        await fetchInitialData(false);
        setCurrentPage(1);
        return true;
      };

      const initialStatus = String(payload.data.status ?? "")
        .trim()
        .toLowerCase();

      if (initialStatus === "completed") {
        return resolveCompletedJob(payload);
      }

      if (["failed", "error", "cancelled", "canceled"].includes(initialStatus)) {
        addNotification(
          "danger",
          payload.data.message || payload.message || t("Unexpected server response")
        );
        return false;
      }

      const jobId = payload.data.job_id;
      let transientJobErrors = 0;

      for (let attempt = 0; attempt < EXTRACT_MAX_POLLS; attempt += 1) {
        await wait(EXTRACT_POLL_INTERVAL_MS);

        const jobResponse = await fetch(
          buildApiUrl(`apisunat/GetDocumentosSunat/jobs/${jobId}/`),
          {
            cache: "no-store",
          }
        );
        const jobPayload = (await jobResponse.json().catch(() => null)) as
          | ExtractDocumentsJobResponse
          | null;

        if (!jobResponse.ok || !jobPayload?.success || !jobPayload?.data) {
          if (
            isTransientExtractJobError(jobResponse.status, jobPayload) &&
            transientJobErrors < EXTRACT_MAX_TRANSIENT_JOB_ERRORS
          ) {
            transientJobErrors += 1;
            continue;
          }

          addNotification(
            "danger",
            jobPayload?.message || t("Unexpected server response")
          );
          return false;
        }

        transientJobErrors = 0;

        const jobStatus = String(jobPayload.data.status ?? "")
          .trim()
          .toLowerCase();

        if (jobStatus === "completed") {
          return resolveCompletedJob(jobPayload);
        }

        if (["failed", "error", "cancelled", "canceled"].includes(jobStatus)) {
          addNotification(
            "danger",
            jobPayload.data.message ||
              jobPayload.message ||
              t("Unexpected server response")
          );
          return false;
        }
      }

      addNotification(
        "warning",
        t("The extraction is still processing. Please try again in a few moments.")
      );
      return false;
    } catch (extractError) {
      console.error("Error extracting SUNAT documents:", extractError);
      addNotification("danger", t("Unexpected server response"));
      return false;
    }
  };

  const exportToExcel = async () => {
    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Documentos");

      try {
        const response = await fetch(LogoDocuware);
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: "png",
        });

        worksheet.addImage(imageId, "B1:D2");
      } catch {
        // Keep the export working even if the logo cannot be embedded.
      }

      worksheet.mergeCells("E1:L2");
      const titleCell = worksheet.getCell("E1");
      titleCell.value = "REPORTE DE DOCUMENTOS";
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.font = { size: 14, bold: true };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9E1F2" },
      };

      ["A1", "A2", "B1", "C1", "D1", "B2", "C2", "D2"].forEach((cell) => {
        worksheet.getCell(cell).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "D9E1F2" },
        };
      });

      const headers = [
        "ID",
        "Serie",
        "Numero",
        "RUC",
        "Razón Social",
        "Tipo Documento",
        "Comprador",
        "Fecha Emisión",
        "Sub Total",
        "IGV",
        "Total",
        "Estado",
      ];

      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      filteredDocuments.forEach((doc) => {
        const row = worksheet.addRow([
          doc.documentid,
          doc.documentserial,
          doc.documentnumber,
          doc.suppliernumber,
          doc.suppliername,
          getTipoDocumentoNombre(doc.documenttype || { tipoid: 0, tipo: "" }),
          doc.driver ?? "",
          moment(doc.documentdate).format("DD/MM/YYYY"),
          parseFloat(doc.amount),
          parseFloat(doc.taxamount),
          parseFloat(doc.totalamount),
          doc.status ? "Activo" : "Pendiente",
        ]);

        row.eachCell((cell, columnNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (columnNumber === 12) {
            cell.font = {
              color: { argb: doc.status ? "008000" : "FF0000" },
              bold: true,
            };
          }

          if ([9, 10, 11].includes(columnNumber)) {
            cell.alignment = { horizontal: "right" };
            cell.numFmt = "#,##0.00";
          }
        });
      });

      worksheet.columns = [
        { width: 6 },
        { width: 10 },
        { width: 12 },
        { width: 15 },
        { width: 35 },
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 15 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      await downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Documentos_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
      );
    } catch (exportError) {
      console.error("Error exporting documents to Excel:", exportError);
      addNotification("danger", t("Could not export Excel file"));
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Container fluid className="mt-4 small-text">
        <FloatingAlerts
          alerts={[{ id: "documents-error", type: "danger", message: error }]}
        />
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4 small-text">
      <Notifications
        notifications={notifications}
        onRemove={(id) =>
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
          )
        }
      />

      <Row>
        <Col xl={12}>
          <Card>
            <CardBody>
              <DocumentFilters
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                dateRange={dateRange}
                onSearchTermChange={(value) => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                onStatusChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                onDateRangeChange={(dates) => {
                  setDateRange(dates);
                  setCurrentPage(1);
                }}
                onExtract={handleExtract}
                onExport={exportToExcel}
              />

              <DocumentTable
                columnWidths={columnWidths}
                onResizeColumn={handleResize}
                documents={paginatedDocuments}
                approvedOrderDocumentNos={approvedOrderDocumentNos}
                getDocumentAssociatedNo={getDocumentAssociatedNo}
                getTipoDocumentoNombre={getTipoDocumentoNombre}
                onView={handleViewDocument}
                onOrderC={handleOpenOrderC}
                onEdit={handleEditClick}
                onDelete={(doc) => handleDelete(doc.documentid)}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {selectedDoc && (
        <DocumentPreview
          document={selectedDoc}
          rotation={rotation}
          previewUrl={getPreviewUrl(selectedDoc.documenturl)}
          downloadUrl={getDownloadUrl(selectedDoc.documenturl)}
          onRotateLeft={rotateLeft}
          onRotateRight={rotateRight}
          onClose={handleClosePreview}
        />
      )}

      <DeleteDocumentModal
        isOpen={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setDocumentToDelete(null);
        }}
        onConfirm={confirmDelete}
        documentId={documentToDelete}
      />
    </Container>
  );
};

export default DocumentList;
