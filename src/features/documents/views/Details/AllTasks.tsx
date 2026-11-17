import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Spinner } from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import LogoDocuware from "../../../../assets/images/LogoDocuware.png";
import FloatingAlerts from "../../../../components/common/FloatingAlerts";
import AppPagination from "../../../../components/common/Pagination";
import { buildApiUrl } from "../../../../helpers/api-url";
import DocumentFilters from "../../components/DetailsFilters";
import DocumentTable from "../../components/DetailsDocumentTable";
import { DocumentDetailsRow } from "../../types/details.types";
import { intelligentSearch } from "../../../../helpers/search-utils";
import { buildDocumentDetailExportRows } from "./exportRows";
import { downloadBlob } from "../../../../helpers/download-blob";

const DocumentDetails: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentDetailsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportAlert, setExportAlert] = useState<string | null>(null);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const startDate = dateRange[0];
  const endDate = dateRange[1];

  // paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(buildApiUrl("documents-all"));
        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error(t("Unexpected server response"));
        }

        setDocuments(data);
      } catch (err: any) {
        setError(err.message || t("Error getting documents"));
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [t]);

  // filtrado
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = intelligentSearch(doc, searchTerm);

    // Usamos moment para comparar correctamente las fechas
    const docDate = moment(doc.documentdate, ["YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY"], true);

    const matchesDate =
      (!startDate || docDate.isSameOrAfter(moment(startDate), "day")) &&
      (!endDate || docDate.isSameOrBefore(moment(endDate), "day"));

    return matchesSearch && matchesDate;
  });

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates: Date[]) => {
    setDateRange(dates);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // exportar a excel Detalles
  const exportToExcel = async () => {
    try {
      setExportAlert(null);
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Detalles de Documentos");

      try {
        const response = await fetch(LogoDocuware);
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: "png",
        });
        worksheet.addImage(imageId, "B1:B2");
      } catch {
        // Keep the export available even if the logo cannot be embedded.
      }

      worksheet.mergeCells("E1:AJ2");
      const titleCell = worksheet.getCell("E1");
      titleCell.value = "REPORTE DETALLADO DE DOCUMENTOS";
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
        "Movimiento Orden Servicio o Orden",
        "Fecha de Emisión del Comprobante de Pago o Documento",
        "Fecha de Vencimiento o Fecha de Pago",
        "Tipo",
        "Serie/Código Aduana",
        "Año Emisión DUA o DSI",
        "Nro. Comprobante de Pago",
        "Tipo",
        "Número",
        "Apellidos y Nombres, Denominación o Razón Social",
        "Producto",
        "Unidad",
        "Valor de Compra",
      "Base Imponible",
      "IGV",
      "Importe Total",
      "Tipo de Cambio",
      "Fecha",
      "Tipo",
      "Serie",
        "Nro. Comprobante de Pago o Documento",
        "Moneda",
        "Equivalente en Dólares Americanos",
        "Condición Contado/Crédito",
        "Código Centro de Costos",
        "Código Centro de Costos 2",
        "Porcentaje I.G.V.",
        "Cantidad", "Valor unitario", "Cuenta contable", "Comprador", "Placa",
        "Centro de costo del documento", "Subtotal del documento", "IGV del documento", "Total del documento",
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

      const rows = buildDocumentDetailExportRows(filteredDocuments);
      worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };

      rows.forEach((rowData) => {
        const row = worksheet.addRow(rowData);

        row.eachCell((cell, columnNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if ([13, 14, 15, 16, 27, 28, 29, 34, 35, 36].includes(columnNumber)) {
            cell.numFmt = columnNumber === 27 ? "0.00%" : columnNumber === 28 ? "0.######" : "#,##0.00";
            cell.alignment = { horizontal: "right" };
          } else {
            cell.alignment = { horizontal: "left" };
          }
        });
      });

      worksheet.columns = [
        { width: 35 },
        { width: 55 },
        { width: 40 },
        { width: 20 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 50 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 20 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 20 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 20 },
      ];

      [15, 20, 24, 25, 16, 28, 25, 22, 22].forEach((width, index) => {
        worksheet.getColumn(28 + index).width = width;
      });
      worksheet.getCell("AH3").note = "Los totales de cabecera aparecen una vez por comprobante en las filas exportadas.";

      const buffer = await workbook.xlsx.writeBuffer();
      await downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Documentos_Detalle_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
      );
    } catch (exportError) {
      console.error("Error exporting document details to Excel:", exportError);
      setExportAlert(t("Could not export Excel file"));
    }
  };

  if (loading)
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );

  if (error) {
    return (
      <Container fluid className="mt-4 small-text">
        <FloatingAlerts
          alerts={[{ id: "document-details-error", type: "danger", message: error }]}
        />
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4 small-text">
      {exportAlert && (
        <FloatingAlerts
          alerts={[
            {
              id: "document-details-export-error",
              type: "danger",
              message: exportAlert,
            },
          ]}
        />
      )}

      <Row>
        <Col lg={12}>
          <Card>
            <CardBody>
              <DocumentFilters
                searchTerm={searchTerm}
                dateRange={dateRange}
                onSearchTermChange={handleSearchTermChange}
                onDateRangeChange={handleDateRangeChange}
                onExport={exportToExcel}
              />

              <DocumentTable documents={paginatedDocuments} />

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <AppPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredDocuments.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentDetails;
