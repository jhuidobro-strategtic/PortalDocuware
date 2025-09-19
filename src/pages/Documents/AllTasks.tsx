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

interface Document {
  documentid: number;
  documentserial: string;
  documentnumber: string;
  suppliernumber: string;
  documenttype: number;
  documentdate: string;
  amount: string;
  taxamount: string;
  totalamount: string;
  documenturl: string;
  notes: string;
  status: boolean;
  created_by: number;
  created_at: string;
  updated_by?: number | null;
  updated_at?: string | null;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const startDate = dateRange[0];
  const endDate = dateRange[1];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(
          "https://docuware-api-a09ab977636d.herokuapp.com/api/documents"
        );
        const data = await res.json();
        if (data.success) {
          setDocuments(data.data);
        } else {
          throw new Error(data.message || "Error al obtener documentos");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  // 📌 Obtiene el ID del archivo de Google Drive
  const extractDriveId = (url: string) => {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  };

  // 📌 URL para previsualizar en iframe
  const getPreviewUrl = (url: string) => {
    const fileId = extractDriveId(url);
    return fileId
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : url;
  };

  // 📌 URL para descargar
  const getDownloadUrl = (url: string) => {
    const fileId = extractDriveId(url);
    return fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : url;
  };

  const filteredDocuments = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      doc.documentserial.toLowerCase().includes(term) ||
      doc.documentnumber.toLowerCase().includes(term) ||
      doc.suppliernumber.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && doc.status) ||
      (statusFilter === "pending" && !doc.status);

    const matchesDate =
      (!startDate || new Date(doc.documentdate) >= startDate) &&
      (!endDate || new Date(doc.documentdate) <= endDate);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading)
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );

  if (error) return <Alert color="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4">
      <Row>
        {/* 📌 Tabla ocupa todo el ancho si no hay PDF seleccionado */}
        <Col lg={selectedDoc ? 7 : 12}>
          <Card>
            <CardBody>
              {/* 📌 Filtros */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">Lista de Documentos</h4>
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

                  <Input
                    type="select"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ maxWidth: "180px" }}
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="pending">Pendientes</option>
                  </Input>

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
                </div>
              </div>

              {/* 📌 Tabla */}
              <div className="table-responsive">
                <Table className="table align-middle table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Serie</th>
                      <th>Número</th>
                      <th>Proveedor</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center">
                          No se encontraron registros
                        </td>
                      </tr>
                    )}
                    {paginatedDocuments.map((doc) => (
                      <tr key={doc.documentid}>
                        <td>
                          <b>#{doc.documentid}</b>
                        </td>
                        <td>{doc.documentserial}</td>
                        <td>{doc.documentnumber}</td>
                        <td>{doc.suppliernumber}</td>
                        <td>{doc.documenttype}</td>
                        <td>
                          {moment(doc.documentdate).format("DD MMM YYYY")}
                        </td>
                        <td>
                          <b>S/ {doc.totalamount}</b>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              doc.status ? "bg-success" : "bg-warning"
                            }`}
                          >
                            {doc.status ? "Activo" : "Pendiente"}
                          </span>
                        </td>
                        <td>
                          <div className="hstack gap-2">
                            <Button
                              size="sm"
                              color="info"
                              outline
                              onClick={() => setSelectedDoc(doc)}
                            >
                              <i className="ri-eye-fill align-bottom" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* 📌 Paginación */}
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

        {/* 📌 Columna derecha solo aparece si hay documento seleccionado */}
        {selectedDoc && (
          <Col lg={5}>
            <Card>
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Vista previa del documento</h5>
                  <div className="d-flex gap-2">
                    <a
                      href={getDownloadUrl(selectedDoc.documenturl)}
                      download
                      className="btn btn-sm btn-success"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-download-2-line" /> Descargar
                    </a>
                    <Button
                      size="sm"
                      color="danger"
                      onClick={() => setSelectedDoc(null)}
                    >
                      <i className="ri-close-line" /> Cerrar
                    </Button>
                  </div>
                </div>

                <iframe
                  src={getPreviewUrl(selectedDoc.documenturl)}
                  style={{ width: "100%", height: "80vh", border: "none" }}
                  title="Visor PDF"
                />
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default DocumentList;
