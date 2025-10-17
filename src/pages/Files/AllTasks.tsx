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
      doc.description.toLowerCase().includes(term);

    const matchesDate =
      (!startDate || new Date(doc.documentdate) >= startDate) &&
      (!endDate || new Date(doc.documentdate) <= endDate);

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // exportar a excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Documentos");

    // logo
    try {
      const response = await fetch(LogoDocuware);
      const imageBuffer = await response.arrayBuffer();
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: "png",
      });
      worksheet.addImage(imageId, "B1:D2");
    } catch {
      // si falla el logo, seguimos sin bloquear
    }

    // título
    worksheet.mergeCells("E1:K2");
    const titleCell = worksheet.getCell("E1");
    titleCell.value = "REPORTE DE DOCUMENTOS";
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.font = { size: 14, bold: true };

    // encabezados (ahora con los campos adicionales)
    const headers = [
      "Tipo Documento",
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

    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
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

    // datos (desde fila 4)
    filteredDocuments.forEach((doc) => {
      const row = worksheet.addRow([
        doc.documenttype,
        doc.documentserial,
        doc.documentnumber,
        moment(doc.documentdate).format("DD/MM/YYYY"),
        doc.suppliernumber,
        doc.suppliername,
        doc.description,
        doc.vehicle_nro || "—",
        doc.unit_measure_description || "—",
        doc.quantity ?? 0,
        doc.unit_value ?? 0,
        doc.total_value ?? 0,
        doc.currency,
        doc.amount ?? 0,
        doc.taxamount ?? 0,
        doc.totalamount ?? 0,
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // formato numérico para columnas de importe
        if ([10, 11, 12, 14, 15, 16].includes(colNumber)) {
          // columns: cantidad(10), unit_value(11), total_value(12), amount(14), taxamount(15), totalamount(16)
          if (colNumber === 10) {
            cell.numFmt = "#,##0"; // cantidad sin decimales
            cell.alignment = { horizontal: "right" };
          } else {
            cell.numFmt = "#,##0.00";
            cell.alignment = { horizontal: "right" };
          }
        } else {
          cell.alignment = { horizontal: "left" };
        }
      });
    });

    // ajustar anchos
    worksheet.columns = [
      { width: 18 }, // Tipo Documento
      { width: 8 }, // Serie
      { width: 10 }, // Número
      { width: 12 }, // Fecha
      { width: 15 }, // RUC
      { width: 30 }, // Nombre proveedor
      { width: 40 }, // Descripción
      { width: 14 }, // Vehículo
      { width: 18 }, // Unidad medida
      { width: 8 }, // Cantidad
      { width: 12 }, // Valor unitario
      { width: 14 }, // Valor total línea
      { width: 8 }, // Moneda
      { width: 12 }, // Sub Total
      { width: 12 }, // IGV
      { width: 12 }, // Total
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Documentos_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
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
                      options={{ mode: "range", dateFormat: "Y-m-d" }}
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
