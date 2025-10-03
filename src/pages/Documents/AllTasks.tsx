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
import "./Documents.css";
import CurrencyDropdown from "./CurrencyDropdown";
import Draggable from "react-draggable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import LogoDocuware from "../../assets/images/LogoDocuware.png";

interface Document {
  documentid: number;
  documentserial: string;
  documentnumber: string;
  suppliernumber: string;
  suppliername: string;
  documenttype: number | { tipoid: number; tipo: string } | null;
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
  currency: string;
}

interface TipoDocumento {
  tipoid: number;
  tipo: string;
}

interface DocumentDetail {
  detailid: number;
  documentserial: string;
  documentnumber: string;
  suppliernumber: string;
  unit_measure_description: string;
  description: string;
  quantity: number;
  unit_value: string;
  tax_value: string;
  total_value: string;
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
  const [docDetails, setDocDetails] = useState<DocumentDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 📌 Vista previa
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotateLeft = () => setRotation((prev) => prev - 90);
  const rotateRight = () => setRotation((prev) => prev + 90);

  // 📌 Edición
  const [editModal, setEditModal] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);

  // 📌 Tipos de documento
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);

  // 📌 Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const startDate = dateRange[0];
  const endDate = dateRange[1];

  // 📌 Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 📌 Estado para spinner RUC
  const [loadingRuc, setLoadingRuc] = useState(false);

  // 📌 Estado adicional para IGV %
  const [editIgvPercent, setEditIgvPercent] = useState<number>(18);

  const [notifications, setNotifications] = useState<
    { id: number; type: string; message: string }[]
  >([]);

  const addNotification = (type: string, message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);

    // 🔥 Se elimina automáticamente después de 5s
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

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

    const fetchTiposDocumento = async () => {
      try {
        const res = await fetch(
          "https://docuware-api-a09ab977636d.herokuapp.com/api/tipo-documento"
        );
        const data = await res.json();
        if (data.success) {
          setTiposDocumento(data.data);
        }
      } catch (error) {
        console.error("Error al cargar tipos de documento:", error);
      }
    };

    fetchDocuments();
    fetchTiposDocumento();
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

    // 🔹 Validación básica
    const isValid =
      editDoc.documentserial.trim() !== "" &&
      editDoc.documentnumber.trim() !== "" &&
      editDoc.suppliernumber.trim() !== "" &&
      editDoc.suppliername.trim() !== "" &&
      editDoc.documenttype !== null &&
      editDoc.documentdate.trim() !== "" &&
      parseFloat(editDoc.amount) > 0 &&
      parseFloat(editDoc.taxamount) > 0 &&
      parseFloat(editDoc.totalamount) > 0;

    if (!isValid) {
      addNotification("danger", "Complete todos los campos correctamente");
      return;
    }

    try {
      setLoadingDetails(true);

      // 🔹 1️⃣ Verificar si existen detalles en documents-detail
      const query = new URLSearchParams({
        suppliernumber: editDoc.suppliernumber,
        documentserial: editDoc.documentserial,
        documentnumber: editDoc.documentnumber,
      });

      const resGet = await fetch(
        `https://docuware-api-a09ab977636d.herokuapp.com/api/documents-detail/?${query.toString()}`
      );
      const dataGet = await resGet.json();
      const hasDetails = dataGet && dataGet.length > 0;

      // 🔹 2️⃣ Si no existen detalles, llamar a SUNAT
      let sunatPayload: any = null;
      if (!hasDetails) {
        const sunatRes = await fetch(
          "https://dev.apisunat.pe/api/v1/sunat/comprobante",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo_comprobante: editDoc.documenttype === 1 ? "01" : "03", // ejemplo
              ruc_emisor: editDoc.suppliernumber,
              serie: editDoc.documentserial,
              numero: editDoc.documentnumber,
            }),
          }
        );
        const sunatData = await sunatRes.json();

        if (!sunatData.success) {
          addNotification("danger", "Error al consultar SUNAT");
          return;
        }

        sunatPayload = sunatData.payload;

        // 🔹 3️⃣ Registrar items en backend
        const itemsToRegister = sunatPayload.items || [];
        for (const item of itemsToRegister) {
          await fetch("http://127.0.0.1:8000/api/documents-detail/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentserial: sunatPayload.detalle.serie,
              documentnumber: sunatPayload.detalle.numero,
              suppliernumber: sunatPayload.emisor.ruc,
              unit_measure_description: item.unidad_medida_descripcion,
              description: item.descripcion,
              quantity: parseFloat(item.cantidad),
              unit_value: item.valor_unitario,
              tax_value: item.impuesto_valor,
              total_value: item.precio_unitario,
              status: false,
              created_by: 1,
              created_at: new Date().toISOString(),
              updated_by: null,
              updated_at: null,
            }),
          });
        }

        addNotification("success", "Items registrados desde SUNAT");
      }

      // 🔹 4️⃣ Actualizar documento con PATCH
      const updatedDoc = {
        ...editDoc,
        status: isValid,
        documenttype_id:
          typeof editDoc.documenttype === "object" &&
          editDoc.documenttype !== null
            ? editDoc.documenttype.tipoid
            : editDoc.documenttype,
      };

      const resPatch = await fetch(
        `https://docuware-api-a09ab977636d.herokuapp.com/api/documents/${editDoc.documentid}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedDoc),
        }
      );
      const dataPatch = await resPatch.json();

      if (dataPatch.success) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.documentid === editDoc.documentid
              ? { ...doc, ...editDoc, status: isValid }
              : doc
          )
        );
        setEditModal(false);
        addNotification("success", "Documento actualizado correctamente");
      } else {
        addNotification("danger", dataPatch.message || "Error al actualizar");
      }
    } catch (error) {
      console.error(error);
      addNotification("danger", "Error en el proceso de actualización");
    } finally {
      setLoadingDetails(false);
    }
  };

  const getTipoDocumentoNombre = (
    docType: number | { tipoid: number; tipo: string }
  ): string => {
    if (typeof docType === "number") {
      const tipo = tiposDocumento.find((t) => t.tipoid === docType);
      return tipo ? tipo.tipo : String(docType);
    }
    if (typeof docType === "object" && docType !== null) {
      return docType.tipo;
    }
    return "Desconocido";
  };

  // 📌 Consultar RUC en Factiliza
  const handleSearchRuc = async () => {
    if (!editDoc?.suppliernumber) {
      addNotification("danger", "Ingrese un RUC válido");
      return;
    }

    setLoadingRuc(true);
    try {
      const res = await fetch(
        `https://api.factiliza.com/v1/ruc/info/${editDoc.suppliernumber}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ODEiLCJuYW1lIjoiQ29ycG9yYWNpb24gQUNNRSIsImVtYWlsIjoicmZsb3JlekBhY21ldGljLmNvbS5wZSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6ImNvbnN1bHRvciJ9.06GySJlpTrqWUQA5EI3tDHvLn8LNzZ2m5VBSIy_SbF4`,
          },
        }
      );

      const data = await res.json();

      if (data.success && data.data?.nombre_o_razon_social) {
        setEditDoc((prev) =>
          prev
            ? { ...prev, suppliername: data.data.nombre_o_razon_social }
            : prev
        );
        addNotification("success", "RUC encontrado correctamente");
      } else {
        addNotification(
          "danger",
          data.message || "No se encontró información del RUC"
        );
      }
    } catch (error) {
      console.error(error);
      addNotification("danger", "Error al consultar RUC");
    } finally {
      setLoadingRuc(false);
    }
  };

  const fetchDetails = async (doc: Document) => {
    setLoadingDetails(true);
    try {
      const query = new URLSearchParams({
        suppliernumber: doc.suppliernumber,
        documentserial: doc.documentserial,
        documentnumber: doc.documentnumber,
      });

      const res = await fetch(
        `https://docuware-api-a09ab977636d.herokuapp.com/api/documents-detail/?${query.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = await res.json();
      setDocDetails(data || []);
    } catch (err) {
      console.error("Error cargando detalles:", err);
      setDocDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 📌 Generar Excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Documentos");

    // 🔹 Insertar logo (en B1:D2)
    const response = await fetch(LogoDocuware);
    const imageBuffer = await response.arrayBuffer();

    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });

    worksheet.addImage(imageId, "B1:D2");

    // 🔹 Estilo del título (E1:K2)
    worksheet.mergeCells("E1:K2");
    const titleCell = worksheet.getCell("E1");
    titleCell.value = "REPORTE DE DOCUMENTOS";
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.font = { size: 14, bold: true };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9E1F2" },
    };

    // 🔹 Fondo también en celdas del logo (B1:D2)
    ["A1", "A2", "B1", "C1", "D1", "B2", "C2", "D2"].forEach((cell) => {
      worksheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9E1F2" },
      };
    });

    // 🔹 Encabezados en fila 3
    const headers = [
      "ID",
      "Serie",
      "Número",
      "RUC",
      "Razón Social",
      "Tipo Documento",
      "Fecha Emisión",
      "Sub Total",
      "IGV",
      "Total",
      "Estado",
    ];

    headers.forEach((header, i) => {
      const cell = worksheet.getCell(3, i + 1); // fila 3, columna i+1
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
      const row = worksheet.addRow([
        doc.documentid,
        doc.documentserial,
        doc.documentnumber,
        doc.suppliernumber,
        doc.suppliername,
        getTipoDocumentoNombre(doc.documenttype || { tipoid: 0, tipo: "" }),
        moment(doc.documentdate).format("DD/MM/YYYY"),
        parseFloat(doc.amount),
        parseFloat(doc.taxamount),
        parseFloat(doc.totalamount),
        doc.status ? "Activo" : "Pendiente",
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNumber === 11) {
          cell.font = {
            color: { argb: doc.status ? "008000" : "FF0000" },
            bold: true,
          };
        }
        if ([8, 9, 10].includes(colNumber)) {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "#,##0.00";
        }
      });
    });

    // 🔹 Ajustar anchos
    worksheet.columns = [
      { width: 6 }, // ID
      { width: 10 }, // Serie
      { width: 12 }, // Número
      { width: 15 }, // RUC
      { width: 35 }, // Razón Social
      { width: 20 }, // Tipo Documento
      { width: 15 }, // Fecha
      { width: 12 }, // Sub Total
      { width: 12 }, // IGV
      { width: 12 }, // Total
      { width: 15 }, // Estado
    ];

    // 🔹 Generar y descargar
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
      {/* 📌 Notificaciones flotantes */}
      <div className="notification-container">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`alert alert-${n.type} alert-dismissible fade show notification-fade d-flex align-items-center`}
            role="alert"
          >
            {/* ✅ Ícono según tipo */}
            {n.type === "success" && <i className="ri-check-line me-2"></i>}
            {n.type === "danger" && (
              <i className="ri-error-warning-line me-2"></i>
            )}
            {n.type === "warning" && <i className="ri-alert-line me-2"></i>}
            {n.type === "info" && <i className="ri-information-line me-2"></i>}

            {/* Mensaje */}
            <span>{n.message}</span>

            {/* Botón cerrar */}
            <button
              type="button"
              className="btn-close ms-auto"
              onClick={() =>
                setNotifications((prev) => prev.filter((x) => x.id !== n.id))
              }
            ></button>
          </div>
        ))}
      </div>
      <Row>
        {/* 📌 Tabla ocupa todo el ancho si no hay PDF seleccionado */}
        <Col lg={selectedDoc ? 7 : 12}>
          <Card>
            <CardBody>
              {/* 📌 Filtros */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0" style={{ fontSize: "1.2rem" }}>
                  Lista de Documentos
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
                  <Button color="success" onClick={exportToExcel}>
                    <i className="ri-file-excel-2-line"></i>
                  </Button>
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
                      <th>RUC</th>
                      <th>Razón Social</th>
                      <th>Tipo Documento</th>
                      <th>Fecha Emisión</th>
                      <th>Moneda</th>
                      <th>Sub Total</th>
                      <th>IGV</th>
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
                        <td>
                          {doc.documenttype
                            ? getTipoDocumentoNombre(doc.documenttype)
                            : "N/A"}
                        </td>
                        <td>{moment(doc.documentdate).format("DD/MM/YYYY")}</td>
                        <td>S/ $</td>
                        <td>{doc.amount}</td>
                        <td>{doc.taxamount}</td>
                        <td>
                          <b>{doc.totalamount}</b>
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
                              <i className="ri-eye-line align-bottom" />
                              <span> Ver</span>
                            </Button>
                            {/* Editar */}
                            <Button
                              size="sm"
                              color="warning"
                              outline
                              onClick={() => {
                                setEditDoc(doc);

                                // calcular IGV %
                                const amt = parseFloat(doc.amount || "0");
                                const tax = parseFloat(doc.taxamount || "0");
                                setEditIgvPercent(
                                  amt > 0 && tax > 0
                                    ? Math.round((tax / amt) * 100)
                                    : 0
                                );

                                // traer detalles
                                fetchDetails(doc);

                                setEditModal(true);
                              }}
                            >
                              <i className="ri-edit-box-line align-bottom" />
                              <span> Editar</span>
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
                  <h5 className="mb-0 small-text">
                    Vista previa del documento
                  </h5>
                  <div className="d-flex gap-2">
                    <a
                      href={getDownloadUrl(selectedDoc.documenturl)}
                      download
                      className="btn btn-sm btn-success"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-download-2-line" />
                      <span className="d-none d-md-inline"> Descargar</span>
                    </a>

                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setRotation((r) => r - 90)}
                      >
                        <i className="ri-arrow-go-back-line" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setRotation((r) => r + 90)}
                      >
                        <i className="ri-arrow-go-forward-line" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      color="danger"
                      onClick={() => setSelectedDoc(null)}
                    >
                      <i className="ri-close-line" />
                      <span className="d-none d-md-inline"> Cerrar</span>
                    </Button>
                  </div>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "66vh",
                    overflow: "auto", // Permite scroll si se descuadra
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#f8f9fa",
                  }}
                >
                  <div
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transformOrigin: "center center", // Gira desde el centro
                      transition: "transform 0.3s ease",
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <iframe
                      src={getPreviewUrl(selectedDoc.documenturl)}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                      }}
                      title="Visor PDF"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>

      {/* 📌 Modal Editar */}
      <Modal
        isOpen={editModal}
        toggle={() => setEditModal(false)}
        size="lg"
        centered={false}
        // backdrop={false}
        contentClassName="p-0 border-0 shadow-none bg-transparent"
      >
        <Draggable handle=".modal-header">
          <div className="modal-dialog modal-lg" style={{ margin: 0 }}>
            <div className="modal-content">
              <ModalHeader
                toggle={() => setEditModal(false)}
                className="modal-header"
              >
                Editar Documento
              </ModalHeader>
              <ModalBody>
                {editDoc && (
                  <Form>
                    <Row>
                      {/* RUC */}
                      <Col md="4">
                        <FormGroup>
                          <Label className="form-label">RUC</Label>
                          <InputGroup>
                            <Input
                              value={editDoc.suppliernumber}
                              onChange={(e) =>
                                setEditDoc({
                                  ...editDoc,
                                  suppliernumber: e.target.value,
                                })
                              }
                              placeholder="Ingrese RUC"
                            />

                            <Button
                              color="secondary"
                              onClick={handleSearchRuc}
                              disabled={loadingRuc}
                            >
                              {loadingRuc ? (
                                <Spinner size="sm" color="light" />
                              ) : (
                                <i className="ri-search-line" />
                              )}
                            </Button>
                          </InputGroup>
                        </FormGroup>
                      </Col>

                      {/* Razón Social */}
                      <Col md="8">
                        <FormGroup>
                          <Label className="form-label">Razón Social</Label>
                          <Input
                            value={editDoc.suppliername}
                            disabled
                            placeholder="Razón Social"
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row>
                      {/* Tipo Documento */}
                      <Col md="4">
                        <FormGroup>
                          <Label className="form-label">Tipo Documento</Label>
                          <Input
                            type="select"
                            value={
                              editDoc.documenttype &&
                              typeof editDoc.documenttype === "object"
                                ? editDoc.documenttype.tipoid
                                : editDoc.documenttype ?? ""
                            }
                            onChange={(e) =>
                              setEditDoc({
                                ...editDoc,
                                documenttype: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                          >
                            <option value="">Seleccione...</option>
                            {tiposDocumento.map((tipo) => (
                              <option key={tipo.tipoid} value={tipo.tipoid}>
                                {tipo.tipo}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>

                      {/* Nro Serie */}
                      <Col md="4">
                        <FormGroup>
                          <Label className="form-label">Nro Serie</Label>
                          <Input
                            value={editDoc.documentserial}
                            onChange={(e) =>
                              setEditDoc({
                                ...editDoc,
                                documentserial: e.target.value,
                              })
                            }
                            placeholder="Ej: F001"
                          />
                        </FormGroup>
                      </Col>

                      {/* Nro Documento */}
                      <Col md="4">
                        <FormGroup>
                          <Label className="form-label">Nro Documento</Label>
                          <Input
                            value={editDoc.documentnumber}
                            onChange={(e) =>
                              setEditDoc({
                                ...editDoc,
                                documentnumber: e.target.value,
                              })
                            }
                            placeholder="Ej: 000123"
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row>
                      {/* Fecha Emisión */}
                      <Col md="3">
                        <FormGroup>
                          <Label className="form-label">Fecha Emisión</Label>
                          <InputGroup>
                            <InputGroupText>
                              <i className="ri-calendar-line" />
                            </InputGroupText>
                            <Flatpickr
                              className="form-control"
                              options={{ dateFormat: "Y-m-d" }}
                              value={editDoc.documentdate}
                              onChange={(dates: Date[]) =>
                                setEditDoc({
                                  ...editDoc,
                                  documentdate: moment(dates[0]).format(
                                    "YYYY-MM-DD"
                                  ),
                                })
                              }
                            />
                          </InputGroup>
                        </FormGroup>
                      </Col>

                      {/* Moneda */}
                      <Col md={2}>
                        <FormGroup>
                          <Label>Moneda</Label>
                          <CurrencyDropdown
                            value={editDoc?.currency || "PEN"}
                            onChange={(val) =>
                              setEditDoc({ ...editDoc!, currency: val })
                            }
                          />
                        </FormGroup>
                      </Col>

                      {/* Sub Total */}
                      <Col md={2}>
                        <FormGroup>
                          <Label>Sub Total</Label>
                          <Input
                            type="number"
                            value={editDoc.amount}
                            onChange={(e) => {
                              const newAmount = e.target.value;
                              setEditDoc({
                                ...editDoc,
                                amount: newAmount,
                                totalamount: (
                                  parseFloat(newAmount || "0") +
                                  parseFloat(editDoc.taxamount || "0")
                                ).toFixed(2),
                              });
                            }}
                          />
                        </FormGroup>
                      </Col>

                      {/* Select IGV + Input bloqueado */}
                      <Col md={3}>
                        <FormGroup>
                          <Label>IGV</Label>
                          <InputGroup>
                            {/* Select de porcentaje */}
                            <Input
                              type="select"
                              value={editIgvPercent}
                              onChange={(e) => {
                                const percent = parseFloat(e.target.value);
                                setEditIgvPercent(percent);

                                if (editDoc) {
                                  const amt = parseFloat(editDoc.amount || "0");
                                  const newTax = (amt * percent) / 100;
                                  const newTotal = amt + newTax;

                                  setEditDoc({
                                    ...editDoc,
                                    taxamount: newTax.toFixed(2),
                                    totalamount: newTotal.toFixed(2),
                                  });
                                }
                              }}
                            >
                              <option value={0}>0%</option>
                              <option value={2}>2%</option>
                              <option value={8}>8%</option>
                              <option value={16}>16%</option>
                              <option value={18}>18%</option>
                            </Input>

                            {/* Input que muestra el monto en soles */}
                            <Input
                              type="number"
                              value={editDoc?.taxamount || "0.00"}
                              disabled
                              readOnly
                            />
                          </InputGroup>
                        </FormGroup>
                      </Col>

                      {/* Total */}
                      <Col md={2}>
                        <FormGroup>
                          <Label>Total</Label>
                          <Input
                            type="number"
                            value={editDoc.totalamount}
                            disabled
                            readOnly
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row>
                      {/* Notas */}
                      <Col md="12">
                        <FormGroup>
                          <Label className="form-label">Notas</Label>
                          <Input
                            type="textarea"
                            rows={3}
                            value={editDoc.notes}
                            onChange={(e) =>
                              setEditDoc({ ...editDoc, notes: e.target.value })
                            }
                            placeholder="Ingrese observaciones..."
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <h5 className="mt-3">Detalles de Factura</h5>
                    {loadingDetails ? (
                      <div className="text-center my-3">
                        <Spinner color="primary" />
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <Table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              {/* <th className="text-center">Nro</th> */}                              
                              <th className="text-center">Unidad</th>
                              <th className="text-center">Descripción</th>
                              <th className="text-center">Cantidad</th>
                              <th className="text-center">V. Unitario</th>
                              <th className="text-center">IGV</th>
                              <th className="text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docDetails.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center">
                                  No hay detalles disponibles
                                </td>
                              </tr>
                            ) : (
                              docDetails.map((d) => (
                                <tr key={d.detailid}>
                                  {/* <td className="text-center">{d.detailid}</td> */}
                                  <td className="text-center">
                                    {d.unit_measure_description}
                                  </td>
                                  <td className="text-center">
                                    {d.description}
                                  </td>
                                  <td className="text-center">{d.quantity}</td>
                                  <td className="text-center">
                                    {d.unit_value}
                                  </td>
                                  <td className="text-center">{d.tax_value}</td>
                                  <td className="text-center">
                                    {d.total_value}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Form>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onClick={handleUpdate}>
                  Guardar
                </Button>
                <Button color="secondary" onClick={() => setEditModal(false)}>
                  Cancelar
                </Button>
              </ModalFooter>
            </div>
          </div>
        </Draggable>
      </Modal>
    </Container>
  );
};

export default DocumentList;
