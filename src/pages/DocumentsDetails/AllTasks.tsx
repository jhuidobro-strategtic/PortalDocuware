import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Spinner, Pagination,
  PaginationItem, PaginationLink } from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import LogoDocuware from "../../assets/images/LogoDocuware.png";
import FloatingAlerts from "../../Components/Common/FloatingAlerts";
import { buildApiUrl } from "../../helpers/api-url";
import DocumentFilters from "./components/DocumentFilters";
import DocumentTable from "./components/DocumentTable";
import { DocumentDetailsRow } from "./types";
import { intelligentSearch } from "../../helpers/search-utils";

const DocumentDetails: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentDetailsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const docDate = moment(doc.documentdate, ["YYYY/MM/DD", "DD/MM/YYYY"]);

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
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import("exceljs"),
      import("file-saver"),
    ]);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Detalles de Documentos");

    // 🔹 Insertar logo temporal
    try {
      const response = await fetch(LogoDocuware);
      const imageBuffer = await response.arrayBuffer();
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: "png",
      });
      worksheet.addImage(imageId, "B1:B2");
    } catch {
      console.warn("⚠️ No se pudo cargar el logo, se continúa sin bloquear.");
    }

    // 🔹 Título
    worksheet.mergeCells("E1:AA2");
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

    // 🔹 Encabezados
    const headers = [
      "Movimiento Orden Servicio o Orden",
      "Fecha de Emisión del Comprobante de Pago o Documento",
      "Fecha de Vencimiento o Fecha de Pago",
      "Tipo",
      "Serie/Codigo Aduana",
      "Año Emisión DUA o DSI",
      "Nº Comprobante Pago",
      "Tipo",
      "Número",
      "Apellidos y Nombres, Denominación o Razon social",
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
      "Nº Comprobante Pago o Documento",
      "Moneda",
      "Equivalente en Dolares Americanos",
      "Condición Contado/Credito",
      "Codigo Centro de Costos",
      "Codigo Centro de Costos 2",
      "Porcentaje I.G.V."
    ];

    headers.forEach((header, i) => {
      const cell = worksheet.getCell(3, i + 1);
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

    // 🔹 Datos (empiezan en fila 4)
    filteredDocuments.forEach((doc) => {
      // asegurar que todos los valores sean strings o números válidos
      const tipoDocumento =
        typeof doc.documenttype === "object" && doc.documenttype !== null
          ? (doc.documenttype as any).tipo ?? "N/A"
          : (doc.documenttype ?? "N/A").toString();

      //temporal
      const movimientoOrden = "";
      const fechaVencimiento = "";
      const añoEmision = "";
      const dTipo = "";
      const producto = "";
      const vCompra = "";
      const rFecha = "";
      const rTipo = "";
      const rSerie = "";
      const rNroComprobante = "";
      const tipoCambio = "";
      const equivalenteDolar = "";
      const condicionCC = "";
      const codigoCC = "";
      const codigoCC2 = "";
      const amount = Number((doc as any).amount ?? 0);
      const taxamount = Number((doc as any).taxamount ?? 0);
      const pIGV = amount > 0 ? ((taxamount / amount) * 100).toFixed(2) : "0.00";

      const rowData = [
        movimientoOrden ?? "",
        moment(doc.documentdate).format("DD/MM/YYYY"),
        fechaVencimiento ?? "",
        tipoDocumento,
        doc.documentserial ?? "",
        añoEmision ?? "",
        doc.documentnumber ?? "",
        dTipo ?? "",
        doc.suppliernumber ?? "",
        doc.suppliername ?? "",
        producto ?? "",
        Number((doc as any).quantity ?? 0),
        vCompra ?? "",
        Number((doc as any).amount ?? 0),
        Number((doc as any).taxamount ?? 0),
        Number((doc as any).totalamount ?? 0),
        tipoCambio,
        rFecha,
        rTipo,
        rSerie,
        rNroComprobante,
        doc.currency ?? "PEN",
        equivalenteDolar,
        condicionCC,
        codigoCC,
        codigoCC2,
        pIGV
      ];

      const row = worksheet.addRow(rowData);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        if ([10, 11, 12, 14, 15, 16].includes(colNumber)) {
          if (colNumber === 10) {
            cell.numFmt = "#,##0";
          } else {
            cell.numFmt = "#,##0.00";
          }
          cell.alignment = { horizontal: "right" };
        } else {
          cell.alignment = { horizontal: "left" };
        }
      });
    });

    // 🔹 Ajustar anchos
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

    // 🔹 Descargar Excel
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Documentos_Detalle_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
    );
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
                  <Pagination>
                    <PaginationItem disabled={currentPage === 1}>
                      <PaginationLink
                        previous
                        onClick={() =>
                          setCurrentPage((p) => Math.max(p - 1, 1))
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationItem key={i} active={currentPage === i + 1}>
                        <PaginationLink onClick={() => setCurrentPage(i + 1)}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem disabled={currentPage === totalPages}>
                      <PaginationLink
                        next
                        onClick={() =>
                          setCurrentPage((p) => Math.min(p + 1, totalPages))
                        }
                      />
                    </PaginationItem>
                  </Pagination>
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
