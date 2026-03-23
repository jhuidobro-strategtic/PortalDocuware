import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import "./Documents.css";
import LogoDocuware from "../../assets/images/LogoDocuware.png";
import FloatingAlerts from "../../Components/Common/FloatingAlerts";
import Notifications from "./components/Notifications";
import DocumentFilters from "./components/DocumentFilters";
import DocumentTable from "./components/DocumentTable";
import DocumentPreview from "./components/DocumentPreview";
import DeleteDocumentModal from "./components/DeleteDocumentModal";
import { buildApiUrl } from "../../helpers/api-url";
import { ColumnWidths, Document, Notification, TipoDocumento } from "./types";
import {
  DOCUMENTS_FLASH_NOTIFICATION_KEY,
  getDownloadUrl,
  getPreviewUrl,
} from "./document-utils";

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
    acciones: 360,
  });

  const addNotification = (type: Notification["type"], message: string) => {
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

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [documentsResponse, documentTypesResponse] = await Promise.all([
          fetch(buildApiUrl("documents")),
          fetch(buildApiUrl("tipo-documento")),
        ]);

        const documentsPayload = await documentsResponse.json();
        const documentTypesPayload = await documentTypesResponse.json();

        if (documentsPayload.success) {
          setDocuments(documentsPayload.data);
        } else {
          throw new Error(documentsPayload.message || t("Error getting documents"));
        }

        if (documentTypesPayload.success) {
          setTiposDocumento(documentTypesPayload.data);
        }
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : t("Unexpected server response");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [t]);

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
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (doc.documentserial ?? "").toLowerCase().includes(term) ||
      (doc.documentnumber ?? "").toLowerCase().includes(term) ||
      (doc.suppliernumber ?? "").toLowerCase().includes(term) ||
      (doc.suppliername ?? "").toLowerCase().includes(term) ||
      (typeof doc.documenttype === "object" &&
        doc.documenttype !== null &&
        doc.documenttype.tipoid?.toString().toLowerCase().includes(term)) ||
      (typeof doc.documenttype === "object" &&
        doc.documenttype !== null &&
        doc.documenttype.tipo?.toLowerCase().includes(term));

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

  const exportToExcel = async () => {
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import("exceljs"),
      import("file-saver"),
    ]);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Documentos");
    const response = await fetch(LogoDocuware);
    const imageBuffer = await response.arrayBuffer();

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });

    worksheet.addImage(imageId, "B1:D2");

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
      "Razon Social",
      "Tipo Documento",
      "Comprador",
      "Fecha Emision",
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

        if (columnNumber === 11) {
          cell.font = {
            color: { argb: doc.status ? "008000" : "FF0000" },
            bold: true,
          };
        }

        if ([8, 9, 10].includes(columnNumber)) {
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
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Documentos_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
    );
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
                onExport={exportToExcel}
              />

              <DocumentTable
                columnWidths={columnWidths}
                onResizeColumn={handleResize}
                documents={paginatedDocuments}
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
