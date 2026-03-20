import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, CardBody, Spinner, Alert } from "reactstrap";
import moment from "moment";
import "./Documents.css";
import LogoDocuware from "../../assets/images/LogoDocuware.png";
import Notifications from "./components/Notifications";
import DocumentFilters from "./components/DocumentFilters";
import DocumentTable from "./components/DocumentTable";
import DocumentPreview from "./components/DocumentPreview";
import EditDocumentModal from "./components/EditDocumentModal";
import DeleteDocumentModal from "./components/DeleteDocumentModal";
import {
  ColumnWidths,
  Document,
  DocumentDetail,
  CentroCosto,
  TipoDocumento,
  Notification,
} from "./types";

const DocumentList: React.FC = () => {
  const navigate = useNavigate();
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

  // 📌 Centros de Costos
  const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([]);

  // 📌 Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const startDate = dateRange[0];
  const endDate = dateRange[1];

  // 📌 Modal de confirmación de eliminación
  const [deleteModal, setDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);

  // 📌 Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 📌 Estado para spinner RUC
  const [loadingRuc, setLoadingRuc] = useState(false);

  // 📌 Estado para spinner Document
  const [loadingDocument, setLoadingDocument] = useState(false);

  // 📌 Estado adicional para IGV %
  const [editIgvPercent, setEditIgvPercent] = useState<number>(18);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: Notification["type"], message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

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

  const handleResize = (column: keyof typeof columnWidths, newWidth: number) => {
    setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
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

    const fetchCentrosCostos = async () => {
      try {
        const res = await fetch(
          "https://docuware-api-a09ab977636d.herokuapp.com/api/centro-costo"
        );
        const data = await res.json();

        if (Array.isArray(data)) {
          setCentrosCostos(data);
        } else {
          console.error("La respuesta no es un array válido:", data);
        }
      } catch (error) {
        console.error("Error al cargar los centros de costos:", error);
      }
    };


    fetchDocuments();
    fetchTiposDocumento();
    fetchCentrosCostos();
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

    // ✅ Corrección del filtro de fechas
    let matchesDate = true;
    if (startDate || endDate) {
      const docDate = moment(doc.documentdate, ["YYYY/MM/DD", "YYYY-MM-DD"]); // formato real del API
      const start = startDate ? moment(startDate).startOf("day") : null;
      const end = endDate ? moment(endDate).endOf("day") : null;

      matchesDate =
        (!start || docDate.isSameOrAfter(start)) &&
        (!end || docDate.isSameOrBefore(end));
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates: Date[]) => {
    setDateRange(dates);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 📌 Guardar cambios con PATCH
  const handleUpdate = async () => {
    if (!editDoc) return;

    const isValid =
      editDoc.documentserial.trim() !== "" &&
      editDoc.documentnumber.trim() !== "" &&
      editDoc.suppliernumber.trim() !== "" &&
      editDoc.suppliername.trim() !== "" &&
      editDoc.documenttype !== null &&
      editDoc.centercost !== null &&
      editDoc.documentdate.trim() !== "" &&
      editDoc.driver.trim() !== "" &&
      parseFloat(editDoc.amount) > 0 &&
      parseFloat(editDoc.taxamount) >= 0 &&
      parseFloat(editDoc.totalamount) > 0;

    if (!isValid) {
      addNotification("danger", "Complete todos los campos correctamente");
      return;
    }

    try {
      setLoadingDetails(true);

      const docTypeValue =
        typeof editDoc.documenttype === "object" &&
          editDoc.documenttype !== null
          ? editDoc.documenttype.tipoid
          : editDoc.documenttype;

      const centerCostValue =
        typeof editDoc.centercost === "object" &&
          editDoc.centercost !== null
          ? editDoc.centercost.centroid
          : editDoc.centercost;

      const updatedDoc = {
        ...editDoc,
        status: isValid,
        documenttype_id: docTypeValue,
        centercost_id: centerCostValue,
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
    docType: Document["documenttype"]
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

  // 📌 Abrir modal de confirmación de eliminación
  const handleDelete = (documentid: number) => {
    setDocumentToDelete(documentid);
    setDeleteModal(true);
  };

  // 📌 Confirmar y ejecutar eliminación
  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(
        "https://docuware-api-a09ab977636d.herokuapp.com/api/document-delete/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentid: documentToDelete,
          }),
        }
      );

      const data = await response.json();

      if (data.success || response.ok) {
        setDocuments((prev) =>
          prev.filter((doc) => doc.documentid !== documentToDelete)
        );
        addNotification("success", "Documento eliminado correctamente");
        setDeleteModal(false);
        setDocumentToDelete(null);
      } else {
        addNotification("danger", data.message || "Error al eliminar el documento");
      }
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      addNotification("danger", "Error en el proceso de eliminación");
    }
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDoc(doc);
  };
  const handleOpenOrderC = (doc: Document) => {
    navigate(`/documents/order-c/${doc.documentid}`, {
      state: { document: doc },
    });
  };

  // 📌 Consultar RUC en Factiliza
  const handleSearchRuc = async () => {
    if (!editDoc?.suppliernumber) {
      addNotification("danger", "Ingrese un RUC válido");
      return;
    }

    setLoadingRuc(true);
    try {
      // 🔹 1️⃣ Consultar RUC en Factiliza
      const factilizaRes = await fetch(
        `https://api.factiliza.com/v1/ruc/info/${editDoc.suppliernumber}`,
        {
          headers: {
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ODEiLCJuYW1lIjoiQ29ycG9yYWNpb24gQUNNRSIsImVtYWlsIjoicmZsb3JlekBhY21ldGljLmNvbS5wZSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6ImNvbnN1bHRvciJ9.06GySJlpTrqWUQA5EI3tDHvLn8LNzZ2m5VBSIy_SbF4`,
          },
        }
      );
      const factilizaData = await factilizaRes.json();

      if (factilizaData.success && factilizaData.data?.nombre_o_razon_social) {
        setEditDoc((prev) =>
          prev
            ? {
              ...prev,
              suppliername: factilizaData.data.nombre_o_razon_social,
            }
            : prev
        );
        addNotification("success", "RUC encontrado correctamente");
      } else {
        addNotification("warning", "RUC no encontrado");
      }
    } catch (error) {
      console.error(error);
      addNotification("danger", "Error al consultar RUC o SUNAT");
    } finally {
      setLoadingRuc(false);
    }
  };

  // 📌 Consultar y registrar datos desde SUNAT (solo si no existen registros)
  const handleSearchDocument = async () => {
    if (!editDoc?.suppliernumber) {
      addNotification("danger", "Ingrese un RUC válido");
      return;
    }

    setLoadingDocument(true);
    try {
      // 🔹 Primero verificar si ya existen detalles registrados en el backend
      const query = new URLSearchParams({
        suppliernumber: editDoc.suppliernumber,
        documentserial: editDoc.documentserial,
        documentnumber: editDoc.documentnumber,
      });

      const resExist = await fetch(
        `https://docuware-api-a09ab977636d.herokuapp.com/api/documents-detail/?${query.toString()}`
      );
      const dataExist = await resExist.json();

      if (Array.isArray(dataExist) && dataExist.length > 0) {
        setDocDetails(dataExist);
        addNotification(
          "info",
          "Ya existen detalles registrados. No se consultó SUNAT."
        );
        setLoadingDocument(false);
        return; // 🚫 Detiene aquí, no consulta ni inserta nada
      }

      // 🔹 Determinar tipo de comprobante
      const tipoComprobante =
        typeof editDoc.documenttype === "object" &&
          editDoc.documenttype !== null
          ? String(editDoc.documenttype.tipoid).padStart(2, "0")
          : String(editDoc.documenttype).padStart(2, "0");

      if (
        !tipoComprobante ||
        !editDoc.documentserial ||
        !editDoc.documentnumber
      ) {
        addNotification(
          "warning",
          "Complete Tipo, Serie y Número antes de consultar SUNAT"
        );
        return;
      }

      // 🔹 1️⃣ Consultar comprobante en SUNAT
      const sunatRes = await fetch(
        "https://dev.apisunat.pe/api/v1/sunat/comprobante",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer 327.0b9xy0B3FvkF4dtgymPuAMKfDIktTLvnvuJTIWHiO50NUd1Z4L62IzFhGXmlEOt5wiz3sWtg8IQOas0OgoEXGyjUKNbiJjXrPmMRxTlpU4l9J2PdZkCLwbKJ",
          },
          body: JSON.stringify({
            tipo_comprobante: tipoComprobante,
            ruc_emisor: editDoc.suppliernumber,
            serie: editDoc.documentserial,
            numero: editDoc.documentnumber,
          }),
        }
      );

      const sunatData = await sunatRes.json();

      if (!sunatData.success) {
        addNotification("danger", "Error al obtener comprobante de SUNAT");
        return;
      }

      const sunatPayload = sunatData.payload;
      const { detalle, totales, items } = sunatPayload;

      // 🔹 Actualizar totales en el documento
      const moneda = detalle.codigo_moneda || "PEN";
      const subTotal = parseFloat(totales.total_grav_oner || 0).toFixed(2);
      const igv = parseFloat(totales.total_igv || 0).toFixed(2);
      const total = parseFloat(totales.monto_total_general || 0).toFixed(2);
      const fechaEmision = detalle.fecha_emision || editDoc.documentdate;

      setEditDoc((prev) =>
        prev
          ? {
            ...prev,
            currency: moneda,
            amount: subTotal,
            taxamount: igv,
            totalamount: total,
            documentdate: fechaEmision,
          }
          : prev
      );

      // 🔹 2️⃣ Registrar detalles del comprobante
      const round2 = (num: any) => Number(parseFloat(num).toFixed(2));
      const itemsToRegister = items || [];

      for (const item of itemsToRegister) {
        // 📍 Buscar placa en la descripción
        let texto = item.descripcion || "";
        let textoLimpio = texto
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        let match = textoLimpio.match(/PLACA[:\s-]*([A-Z0-9-]{5,8})\b/i);
        if (!match) {
          const posibles = textoLimpio.match(/\b[A-Z0-9-]{5,8}\b/g);
          if (posibles) {
            match = posibles.find(
              (c: string) => /[A-Z]/i.test(c) && /\d/.test(c)
            );
          }
        }

        let placa = null;
        if (match) {
          const candidata = (typeof match === "string" ? match : match[1])
            .toUpperCase()
            .replace(/-/g, "");
          if (
            candidata.length >= 5 &&
            candidata.length <= 7 &&
            /[A-Z]/.test(candidata) &&
            /\d/.test(candidata)
          ) {
            placa = candidata;
          }
        }

        // 🔹 Enviar detalle a backend
        await fetch(
          "https://docuware-api-a09ab977636d.herokuapp.com/api/documents-detail/",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentserial: detalle.serie,
              documentnumber: detalle.numero,
              suppliernumber: sunatPayload.emisor.ruc,
              unit_measure_description: item.unidad_medida_descripcion,
              description: item.descripcion,
              vehicle_no: placa,
              quantity: round2(item.cantidad),
              unit_value: round2(item.valor_unitario),
              tax_value: round2(item.impuesto_valor),
              total_value: round2(item.precio_unitario),
              status: false,
              created_by: 1,
              created_at: new Date().toISOString(),
            }),
          }
        );
      }

      // 🔹 3️⃣ Obtener los detalles recién registrados
      const resGet = await fetch(
        `https://docuware-api-a09ab977636d.herokuapp.com/api/documents-detail/?${query.toString()}`
      );
      const dataGet = await resGet.json();

      if (dataGet && dataGet.length > 0) {
        setDocDetails(dataGet);
        addNotification(
          "success",
          "Detalles cargados correctamente desde SUNAT"
        );
      } else {
        addNotification("warning", "No se encontraron detalles en SUNAT");
      }
    } catch (error) {
      console.error(error);
      addNotification("danger", "Error al consultar datos de SUNAT");
    } finally {
      setLoadingDocument(false);
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

  const handleEditClick = (doc: Document) => {
    setEditDoc(doc);
    const amt = parseFloat(doc.amount || "0");
    const tax = parseFloat(doc.taxamount || "0");
    setEditIgvPercent(
      amt > 0 && tax > 0 ? Math.round((tax / amt) * 100) : 0
    );
    fetchDetails(doc);
    setEditModal(true);
  };

  // 📌 Generar Excel
  const exportToExcel = async () => {
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import("exceljs"),
      import("file-saver"),
    ]);
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

    // 🔹 Estilo del título (E1:L2)
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
      "Comprador",
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
        doc.driver ?? "",
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
      { width: 15 }, // Comprador
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

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error) return <Alert color="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4 small-text">
      <Notifications
        notifications={notifications}
        onRemove={(id) =>
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }
      />
      <Row>
        <Col lg={selectedDoc ? 7 : 12}>
          <Card>
            <CardBody>
              <DocumentFilters
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                dateRange={dateRange}
                onSearchTermChange={handleSearchTermChange}
                onStatusChange={handleStatusFilterChange}
                onDateRangeChange={handleDateRangeChange}
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
                onPageChange={handlePageChange}
              />
            </CardBody>
          </Card>
        </Col>
        {selectedDoc && (
          <Col lg={5}>
            <DocumentPreview
              document={selectedDoc}
              rotation={rotation}
              previewUrl={getPreviewUrl(selectedDoc.documenturl)}
              downloadUrl={getDownloadUrl(selectedDoc.documenturl)}
              onRotateLeft={rotateLeft}
              onRotateRight={rotateRight}
              onClose={() => setSelectedDoc(null)}
            />
          </Col>
        )}
      </Row>

      <EditDocumentModal
        editDoc={editDoc}
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        onSave={handleUpdate}
        setEditDoc={setEditDoc}
        editIgvPercent={editIgvPercent}
        setEditIgvPercent={setEditIgvPercent}
        tiposDocumento={tiposDocumento}
        centrosCostos={centrosCostos}
        loadingRuc={loadingRuc}
        loadingDocument={loadingDocument}
        loadingDetails={loadingDetails}
        docDetails={docDetails}
        onSearchRuc={handleSearchRuc}
        onSearchDocument={handleSearchDocument}
      />

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
