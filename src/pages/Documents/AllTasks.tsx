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
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
} from "reactstrap";
import moment from "moment";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";

interface Document {
  documentid: number;
  documentserial: string;
  documentnumber: string;
  suppliernumber: string;
  suppliername: string;
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

  // 📌 Vista previa
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // 📌 Edición
  const [editModal, setEditModal] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);

  // 📌 Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const startDate = dateRange[0];
  const endDate = dateRange[1];

  // 📌 Paginación
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

  // 📌 Google Drive helpers
  const extractDriveId = (url: string) => {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  };

  const getPreviewUrl = (url: string) => {
    const fileId = extractDriveId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
  };

  const getDownloadUrl = (url: string) => {
    const fileId = extractDriveId(url);
    return fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : url;
  };

  // 📌 Filtrado
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

  // 📌 Guardar cambios con PATCH
  const handleUpdate = async () => {
    if (!editDoc) return;
    try {
      const res = await fetch(
        `https://docuware-api-a09ab977636d.herokuapp.com/api/documents/${editDoc.documentid}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editDoc),
        }
      );
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.documentid === editDoc.documentid ? { ...doc, ...editDoc } : doc
          )
        );
        setEditModal(false);
      } else {
        alert(data.message || "Error al actualizar");
      }
    } catch (error) {
      console.error(error);
      alert("Error en el servidor");
    }
  };

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
                      <th>Nombre Proveedor</th>
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
                        <td colSpan={10} className="text-center">
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
                        <td>{doc.suppliername}</td>
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
                            {/* Ver */}
                            <Button
                              size="sm"
                              color="info"
                              outline
                              onClick={() => setSelectedDoc(doc)}
                            >
                              <i className="ri-eye-fill align-bottom" />
                            </Button>
                            {/* Editar */}
                            <Button
                              size="sm"
                              color="warning"
                              outline
                              onClick={() => {
                                setEditDoc(doc);
                                setEditModal(true);
                              }}
                            >
                              <i className="ri-edit-line align-bottom" />
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

        {/* 📌 Vista previa PDF */}
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
                  style={{ width: "100%", height: "66vh", border: "none" }}
                  title="Visor PDF"
                />
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>

      {/* 📌 Modal Editar */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered>
        <ModalHeader toggle={() => setEditModal(false)}>
          Editar Documento
        </ModalHeader>
        <ModalBody>
          {editDoc && (
            <Form>
              <FormGroup>
                <Label>Serie</Label>
                <Input
                  value={editDoc.documentserial}
                  onChange={(e) =>
                    setEditDoc({ ...editDoc, documentserial: e.target.value })
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>Número</Label>
                <Input
                  value={editDoc.documentnumber}
                  onChange={(e) =>
                    setEditDoc({ ...editDoc, documentnumber: e.target.value })
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>Proveedor</Label>
                <Input
                  value={editDoc.suppliernumber}
                  onChange={(e) =>
                    setEditDoc({ ...editDoc, suppliernumber: e.target.value })
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>Nombre Proveedor</Label>
                <Input
                  value={editDoc.suppliername}
                  onChange={(e) =>
                    setEditDoc({ ...editDoc, suppliername: e.target.value })
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>Notas</Label>
                <Input
                  type="textarea"
                  value={editDoc.notes}
                  onChange={(e) =>
                    setEditDoc({ ...editDoc, notes: e.target.value })
                  }
                />
              </FormGroup>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setEditModal(false)}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleUpdate}>
            Guardar Cambios
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default DocumentList;
