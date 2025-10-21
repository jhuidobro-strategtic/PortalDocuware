import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Spinner,
  Alert,
  Button,
  Input,
  InputGroup,
  InputGroupText,
  Pagination,
  PaginationItem,
  PaginationLink,
} from "reactstrap";
import moment from "moment";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import LogoDocuware from "../../assets/images/LogoDocuware.png";

interface Document {
  documenttype: string;
  suppliernumber: string;
  documentserial: string;
  documentnumber: string;
  documentdate: string;
  suppliername: string;
  description: string;
  vehicle_nro: string;
  unit_measure_description: string;
  quantity: number;
  currency: string;
  unit_value: number;
  total_value: number;
  amount: number;
  taxamount: number;
  totalamount: number;
  driver: string;
}

const DocumentDetails: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
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
        const res = await fetch(
          "https://docuware-api-a09ab977636d.herokuapp.com/api/documents-all"
        );
        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Respuesta inesperada del servidor");
        }

        setDocuments(data);
      } catch (err: any) {
        setError(err.message || "Error al obtener documentos");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // filtrado
  const filteredDocuments = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      doc.documentserial.toLowerCase().includes(term) ||
      doc.documentnumber.toLowerCase().includes(term) ||
      doc.suppliernumber.toLowerCase().includes(term) ||
      doc.suppliername.toLowerCase().includes(term) ||
      doc.documenttype.toLowerCase().includes(term) ||
      doc.vehicle_nro.toLowerCase().includes(term) ||
      doc.unit_measure_description.toLowerCase().includes(term) ||
      doc.description.toLowerCase().includes(term) ||
      doc.driver.toLowerCase().includes(term);

    // Usamos moment para comparar correctamente las fechas
    const docDate = moment(doc.documentdate, ["YYYY/MM/DD", "DD/MM/YYYY"]);

    const matchesDate =
      (!startDate || docDate.isSameOrAfter(moment(startDate), "day")) &&
      (!endDate || docDate.isSameOrBefore(moment(endDate), "day"));

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // exportar a excel Detalles
  const exportToExcel = async () => {
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
      worksheet.addImage(imageId, "B1:D2");
    } catch {
      console.warn("⚠️ No se pudo cargar el logo, se continúa sin bloquear.");
    }

    // 🔹 Título
    worksheet.mergeCells("E1:Q2");
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
      "Tipo Documento",
      "Conductor",
      "Serie",
      "Número",
      "Fecha",
      "Proveedor (RUC)",
      "Nombre Proveedor",
      "Descripción",
      "Vehículo",
      "Unidad Medida",
      "Cantidad",
      "Valor Unitario",
      "Valor Total (línea)",
      "Moneda",
      "Sub Total",
      "IGV",
      "Total",
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

      const rowData = [
        tipoDocumento,
        doc.driver ?? "",
        doc.documentserial ?? "",
        doc.documentnumber ?? "",
        moment(doc.documentdate).format("DD/MM/YYYY"),
        doc.suppliernumber ?? "",
        doc.suppliername ?? "",
        (doc as any).description ?? "—",
        (doc as any).vehicle_nro ?? "—",
        (doc as any).unit_measure_description ?? "—",
        Number((doc as any).quantity ?? 0),
        Number((doc as any).unit_value ?? 0),
        Number((doc as any).total_value ?? 0),
        doc.currency ?? "PEN",
        Number((doc as any).amount ?? 0),
        Number((doc as any).taxamount ?? 0),
        Number((doc as any).totalamount ?? 0),
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
      { width: 18 }, // Tipo Documento
      { width: 15 }, // Conductor
      { width: 10 }, // Serie
      { width: 12 }, // Número
      { width: 15 }, // Fecha
      { width: 15 }, // RUC
      { width: 35 }, // Razón Social
      { width: 40 }, // Descripción
      { width: 14 }, // Vehículo
      { width: 18 }, // Unidad medida
      { width: 10 }, // Cantidad
      { width: 12 }, // Valor unitario
      { width: 14 }, // Valor total línea
      { width: 8 },  // Moneda
      { width: 12 }, // Sub Total
      { width: 12 }, // IGV
      { width: 12 }, // Total
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

  if (error) return <Alert color="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4 small-text">
      <Row>
        <Col lg={12}>
          <Card>
            <CardBody>
              {/* filtros */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0" style={{ fontSize: "1.2rem" }}>
                  Lista Detallada de Documentos
                </h4>
                <div className="d-flex align-items-center gap-2">
                  <InputGroup style={{ maxWidth: "250px" }}>
                    <InputGroupText>
                      <i className="ri-search-line" />
                    </InputGroupText>
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </InputGroup>

                  <InputGroup style={{ maxWidth: "280px" }}>
                    <InputGroupText>
                      <i className="ri-calendar-line" />
                    </InputGroupText>
                    <Flatpickr
                      className="form-control"
                      options={{
                        mode: "range",
                        dateFormat: "d/m/Y", // <-- cambia aquí el formato mostrado
                      }}
                      value={dateRange}
                      onChange={(selectedDates: Date[]) => {
                        setDateRange(selectedDates);
                        setCurrentPage(1);
                      }}
                      placeholder="Filtrar por fecha"
                    />
                  </InputGroup>
                  <Button color="success" onClick={exportToExcel}>
                    <i className="ri-file-excel-2-line"></i>
                  </Button>
                </div>
              </div>

              {/* tabla */}
              <div className="table-responsive">
                <Table className="table align-middle table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tipo</th>
                      <th>Conductor</th>
                      <th>Serie</th>
                      <th>Núm</th>
                      <th>Fecha</th>
                      <th>RUC</th>
                      <th>Proveedor</th>
                      <th>Descripción</th>
                      <th>Vehículo</th>
                      <th>Unidad</th>
                      <th className="text-end">Cant.</th>
                      <th className="text-end">V. Unit.</th>
                      <th className="text-end">V. Línea</th>
                      <th>Moneda</th>
                      <th className="text-end">Sub Total</th>
                      <th className="text-end">IGV</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="text-center">
                          No se encontraron registros
                        </td>
                      </tr>
                    ) : (
                      paginatedDocuments.map((doc, index) => (
                        <tr
                          key={`${doc.documentserial}-${doc.documentnumber}-${index}`}
                        >
                          <td>{doc.documenttype}</td>
                          <td>{doc.driver}</td>
                          <td>{doc.documentserial}</td>
                          <td>{doc.documentnumber}</td>
                          <td>{moment(doc.documentdate).format("DD/MM/YYYY")}</td>
                          <td>{doc.suppliernumber}</td>
                          <td>{doc.suppliername}</td>
                          <td style={{ maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {doc.description.replace(/<[^>]*>/g, '')}
                          </td>                          
                          <td>{doc.vehicle_nro || "—"}</td>
                          <td>{doc.unit_measure_description || "—"}</td>
                          <td className="text-end">
                            {(doc.quantity ?? 0).toLocaleString("es-PE", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="text-end">
                            {(doc.unit_value ?? 0).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-end">
                            {(doc.total_value ?? 0).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            {doc.currency === "PEN" && (
                              <img
                                src="https://flagcdn.com/w40/pe.png"
                                alt="Perú"
                                width={20}
                                height={15}
                                className="me-2"
                              />
                            )}
                            {doc.currency === "USD" && (
                              <img
                                src="https://flagcdn.com/w40/us.png"
                                alt="USA"
                                width={20}
                                height={15}
                                className="me-2"
                              />
                            )}
                            {doc.currency}
                          </td>
                          <td className="text-end">
                            {(doc.amount ?? 0).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-end">
                            {(doc.taxamount ?? 0).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-end">
                            <b>
                              {(doc.totalamount ?? 0).toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </b>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* paginación */}
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
