import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  UncontrolledDropdown,
  Spinner,
} from "reactstrap";
import { Link } from "react-router-dom";
import BreadCrumb from "../../../components/common/BreadCrumb";
import { useTranslation } from "react-i18next";
import SimpleBar from "simplebar-react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Folders.css";

// Interfaces for API response
interface InvoiceJobItem {
  id: number;
  original_filename: string;
  r2_key: string;
  r2_url: string;
  status: string;
  error_message: string;
  documentid: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface InvoiceBatchItem {
  batch_id: string;
  status: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  jobs: InvoiceJobItem[];
}

interface InvoiceImportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InvoiceBatchItem[];
}

// Fake data for UI representation
const folderData = [
  { id: 1, name: "Projects", files: 345, size: "4.1 GB" },
  { id: 2, name: "Documents", files: 124, size: "1.2 GB" },
  { id: 3, name: "Media", files: 98, size: "3.4 GB" },
  { id: 4, name: "Design", files: 45, size: "2.1 GB" },
];

const Folders = () => {
  const { t } = useTranslation();
  document.title = `${t("Procesamiento de Archivos")} | PortalDocuware`;

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"folders" | "assets" | "traceability">("folders");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Traceability States
  const [traceabilityData, setTraceabilityData] = useState<InvoiceImportResponse | null>(null);
  const [loadingTraceability, setLoadingTraceability] = useState<boolean>(false);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch Traceability Data
  const fetchTraceabilityData = useCallback(async (page = 1) => {
    setLoadingTraceability(true);
    try {
      const response = await axios.get<InvoiceImportResponse>(
        `https://app-django-docuware.onrender.com/api/invoice-imports/?page=${page}&page_size=20`
      );
      setTraceabilityData(response.data);
      setCurrentPage(page);
    } catch (error: any) {
      console.error("Error loading traceability data:", error);
      toast.error("Error al cargar la trazabilidad de archivos.");
    } finally {
      setLoadingTraceability(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === "traceability" && !traceabilityData) {
      fetchTraceabilityData(1);
    }
  }, [currentView, traceabilityData, fetchTraceabilityData]);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    uploadedFiles.forEach((file) => {
      formData.append("files", file);
    });

    const toastId = toast.loading("Procesando archivos en el servidor...");

    try {
      const response = await axios.post(
        "https://app-django-docuware.onrender.com/api/invoice-imports/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      const apiMessage = response?.data?.message || "Archivos recibidos correctamente. El procesamiento continuara en segundo plano.";
      
      toast.dismiss(toastId);
      toast.success(apiMessage, { autoClose: 8000, theme: "colored" });
      
      setUploadedFiles([]); // clear list on success
      
      // Auto refresh traceability if data was loaded
      fetchTraceabilityData(1);
    } catch (error: any) {
      console.error("Error uploading files:", error);
      let errorMsg = "Hubo un error al subir los archivos.";
      if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message === "Network Error") {
        errorMsg = "Error de red o problema de CORS. Revisa la consola.";
      }
      
      toast.dismiss(toastId);
      toast.error(errorMsg, { autoClose: 8000, theme: "colored" });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="badge bg-success-subtle text-success fs-12 px-2 py-1"><i className="ri-checkbox-circle-line me-1"></i>Completado</span>;
      case "completed_with_errors":
        return <span className="badge bg-warning-subtle text-warning fs-12 px-2 py-1"><i className="ri-error-warning-line me-1"></i>Con Errores</span>;
      case "processing":
        return <span className="badge bg-info-subtle text-info fs-12 px-2 py-1"><i className="ri-loader-4-line me-1"></i>Procesando</span>;
      case "pending":
        return <span className="badge bg-secondary-subtle text-secondary fs-12 px-2 py-1"><i className="ri-time-line me-1"></i>Pendiente</span>;
      default:
        return <span className="badge bg-danger-subtle text-danger fs-12 px-2 py-1">{status}</span>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="badge bg-success-subtle text-success fs-11">Exitoso</span>;
      case "duplicated":
        return <span className="badge bg-primary-subtle text-primary fs-11">Duplicado</span>;
      case "failed_sunat":
        return <span className="badge bg-danger-subtle text-danger fs-11">Error SUNAT</span>;
      case "failed_ocr":
        return <span className="badge bg-danger-subtle text-danger fs-11">Error OCR</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary fs-11">{status}</span>;
    }
  };

  const renderTraceabilityView = () => {
    const batches: InvoiceBatchItem[] = Array.isArray(traceabilityData?.results)
      ? traceabilityData.results
      : [];

    const summary = {
      total_batches: traceabilityData?.count ?? batches.length,
      total_files: batches.reduce((acc, b) => acc + (b.total_files || 0), 0),
      total_processed: batches.reduce((acc, b) => acc + (b.processed_files || 0), 0),
      total_failed: batches.reduce((acc, b) => acc + (b.failed_files || 0), 0),
    };

    return (
      <div id="traceability-view" className="mb-2 fade-in">
        <Row className="justify-content-between align-items-center mb-4">
          <Col>
            <h4 className="mb-sm-0 text-primary fw-bold fs-16">Trazabilidad de Archivos</h4>
            <p className="text-muted mb-0 mt-1 fs-13">Historial y seguimiento en tiempo real de los lotes y documentos procesados.</p>
          </Col>
          <Col className="text-end">
            <button
              className="btn btn-sm btn-soft-primary rounded-pill me-2"
              onClick={() => fetchTraceabilityData(currentPage)}
              disabled={loadingTraceability}
            >
              <i className={`ri-refresh-line align-bottom me-1 ${loadingTraceability ? 'spin' : ''}`}></i> Actualizar
            </button>
            <button className="btn btn-sm btn-soft-secondary rounded-pill" onClick={() => setCurrentView("folders")}>
              <i className="ri-arrow-left-line align-bottom me-1"></i> Volver
            </button>
          </Col>
        </Row>

        {/* KPI Summary Cards */}
        {summary && (
          <Row className="mb-4">
            <Col xl={3} md={6}>
              <Card className="card-animate border-0 shadow-sm bg-primary-subtle">
                <CardBody className="p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="fw-medium text-primary mb-1 fs-13">Total Lotes</p>
                      <h4 className="mb-0 text-primary fw-bold">{summary.total_batches}</h4>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-primary rounded fs-20">
                        <i className="ri-folders-line"></i>
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col xl={3} md={6}>
              <Card className="card-animate border-0 shadow-sm bg-info-subtle">
                <CardBody className="p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="fw-medium text-info mb-1 fs-13">Total Archivos</p>
                      <h4 className="mb-0 text-info fw-bold">{summary.total_files}</h4>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-info rounded fs-20">
                        <i className="ri-file-text-line"></i>
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col xl={3} md={6}>
              <Card className="card-animate border-0 shadow-sm bg-success-subtle">
                <CardBody className="p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="fw-medium text-success mb-1 fs-13">Procesados</p>
                      <h4 className="mb-0 text-success fw-bold">{summary.total_processed}</h4>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-success rounded fs-20">
                        <i className="ri-checkbox-circle-line"></i>
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col xl={3} md={6}>
              <Card className="card-animate border-0 shadow-sm bg-danger-subtle">
                <CardBody className="p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="fw-medium text-danger mb-1 fs-13">Con Fallos / Errores</p>
                      <h4 className="mb-0 text-danger fw-bold">{summary.total_failed}</h4>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-danger rounded fs-20">
                        <i className="ri-error-warning-line"></i>
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}

        {/* Batch List Tree */}
        <Row>
          <Col lg={12}>
            {loadingTraceability ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
                <p className="text-muted mt-2 fs-13">Cargando lotes de trazabilidad...</p>
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 border">
                <i className="ri-folder-open-line text-muted display-4"></i>
                <h5 className="mt-3 text-dark">No hay lotes registrados</h5>
                <p className="text-muted fs-13">Sube nuevos documentos para generar registros de trazabilidad.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {batches.map((batch) => {
                  const isExpanded = !!expandedBatches[batch.batch_id];
                  const formattedDate = new Date(batch.created_at).toLocaleString();

                  return (
                    <div
                      key={batch.batch_id}
                      className={`batch-tree-card ${isExpanded ? "expanded" : ""}`}
                    >
                      {/* Header row (Batch) */}
                      <div
                        className="batch-tree-header d-flex align-items-center justify-content-between"
                        onClick={() => toggleBatchExpand(batch.batch_id)}
                      >
                        <div className="d-flex align-items-center flex-grow-1 overflow-hidden me-3">
                          <span className="batch-tree-toggle-btn">
                            {isExpanded ? "-" : "+"}
                          </span>
                          <div className="overflow-hidden">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <h6 className="mb-0 text-dark fw-bold fs-14">
                                Lote: <span className="font-monospace text-primary">{batch.batch_id}</span>
                              </h6>
                              {getBatchStatusBadge(batch.status)}
                            </div>
                            <p className="text-muted mb-0 fs-12 mt-1">
                              <i className="ri-time-line align-middle me-1"></i> {formattedDate}
                              <span className="mx-2">•</span>
                              <span>
                                {batch.processed_files} de {batch.total_files} archivos procesados
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-3 flex-shrink-0">
                          {batch.failed_files > 0 && (
                            <span className="badge bg-danger-subtle text-danger fs-11">
                              {batch.failed_files} fallido(s)
                            </span>
                          )}
                          <i className={`ri-chevron-${isExpanded ? "up" : "down"}-s-line fs-18 text-muted`}></i>
                        </div>
                      </div>

                      {/* Expanded detail (Jobs list tree) */}
                      {isExpanded && (
                        <div className="batch-jobs-container position-relative">
                          <h6 className="fs-12 text-muted fw-bold text-uppercase mb-3">
                            Archivos del Lote ({batch.jobs.length})
                          </h6>

                          {batch.jobs.length === 0 ? (
                            <p className="text-muted fs-13 mb-0">No se encontraron archivos individuales en este lote.</p>
                          ) : (
                            batch.jobs.map((job) => (
                              <div key={job.id} className="job-tree-item">
                                <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
                                  <div className="d-flex align-items-start gap-2 flex-grow-1 overflow-hidden ms-1">
                                    <i className="ri-file-pdf-fill fs-20 text-danger flex-shrink-0 mt-1"></i>
                                    <div className="overflow-hidden">
                                      <h6 className="fs-13 text-dark fw-semibold mb-1 text-truncate" title={job.original_filename}>
                                        {job.original_filename}
                                      </h6>
                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                        {getJobStatusBadge(job.status)}
                                        {job.documentid && (
                                          <span className="badge bg-info-subtle text-info fs-11">
                                            Doc ID #{job.documentid}
                                          </span>
                                        )}
                                        <span className="text-muted fs-11 ms-1">
                                          ID #{job.id}
                                        </span>
                                      </div>

                                      {job.error_message && (
                                        <div className="alert alert-danger py-1 px-2 fs-12 mt-2 mb-0 border-0 rounded-2">
                                          <i className="ri-error-warning-line me-1"></i> {job.error_message}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    {job.r2_url && (
                                      <a
                                        href={job.r2_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-ghost-primary rounded-pill d-inline-flex align-items-center"
                                        title="Ver / Descargar Documento"
                                      >
                                        <i className="ri-download-2-line me-1 fs-14"></i> Descargar
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Col>
        </Row>

        {/* Pagination */}
        {traceabilityData && (traceabilityData.next || traceabilityData.previous) && (
          <Row className="mt-4">
            <Col lg={12} className="d-flex justify-content-between align-items-center">
              <button
                className="btn btn-sm btn-outline-secondary rounded-pill"
                disabled={!traceabilityData.previous || loadingTraceability}
                onClick={() => fetchTraceabilityData(currentPage - 1)}
              >
                <i className="ri-arrow-left-s-line me-1"></i> Anterior
              </button>
              <span className="fs-13 text-muted">
                Página {currentPage}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary rounded-pill"
                disabled={!traceabilityData.next || loadingTraceability}
                onClick={() => fetchTraceabilityData(currentPage + 1)}
              >
                Siguiente <i className="ri-arrow-right-s-line ms-1"></i>
              </button>
            </Col>
          </Row>
        )}
      </div>
    );
  };

  const renderDropzoneView = () => (
    <div id="dropzone-view" className="mb-2 fade-in">
      <Row className="justify-content-between align-items-center mb-4">
        <Col>
          <h4 className="mb-sm-0 text-primary fw-bold fs-16">Subida de Documentos</h4>
          <p className="text-muted mb-0 mt-1 fs-13">Sube tus facturas (PDF, Imágenes) para ser procesadas automáticamente.</p>
        </Col>
        <Col className="text-end">
          <button className="btn btn-sm btn-soft-secondary rounded-pill" onClick={() => setCurrentView("folders")}>
            <i className="ri-arrow-left-line align-bottom me-1"></i> Volver
          </button>
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
          <div {...getRootProps()} className={`premium-dropzone ${isDragActive ? 'active' : ''}`} style={{ minHeight: '300px' }}>
            <input {...getInputProps()} />
            
            {uploadedFiles.length === 0 ? (
              <div className="premium-dropzone-content">
                <div className="dropzone-icon-wrapper">
                  <i className="ri-cloud-windy-line dropzone-icon"></i>
                </div>
                <h4 className="dropzone-title">Arrastra y suelta tus documentos aquí</h4>
                <p className="dropzone-text">o haz clic para explorar en tu computadora</p>
                <div className="dropzone-badges mt-3">
                  <span className="badge bg-primary-subtle text-primary">PDF</span>
                  <span className="badge bg-primary-subtle text-primary">JPG/PNG</span>
                </div>
              </div>
            ) : (
              <div className="premium-dropzone-content text-start w-100 h-100 d-flex flex-column">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h5 className="text-dark fw-bold mb-1">Archivos en Cola ({uploadedFiles.length})</h5>
                    <p className="text-muted fs-13 mb-0">Puedes seguir arrastrando más documentos aquí dentro o hacer clic en el fondo blanco.</p>
                  </div>
                  <button 
                    className="btn btn-sm btn-soft-danger rounded-pill"
                    onClick={(e) => { e.stopPropagation(); setUploadedFiles([]); }}
                    disabled={isUploading}
                  >
                    <i className="ri-delete-bin-line align-bottom me-1"></i> Limpiar lista
                  </button>
                </div>
                
                <div className={`premium-file-list flex-grow-1 ${isUploading ? 'processing-state' : ''}`}>
                  {uploadedFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="premium-file-item d-flex align-items-center bg-white" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="file-icon-box" style={{ width: '35px', height: '35px', fontSize: '18px' }}>
                        <i className="ri-file-pdf-fill"></i>
                      </div>
                      <div className="file-details flex-grow-1 overflow-hidden ms-3">
                        <h5 className="fs-13 mb-1 text-truncate text-dark fw-medium" title={file.name}>{file.name}</h5>
                        <p className="text-muted mb-0 fs-12">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div className="file-actions ms-3">
                        <button 
                          className="btn btn-sm btn-ghost-danger btn-icon rounded-circle"
                          disabled={isUploading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <i className="ri-close-line fs-16"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {uploadedFiles.length > 0 && (
        <Row className="mt-3 fade-in-up">
          <Col lg={12}>
            <div className="text-end">
              <button 
                className={`btn btn-primary shadow-sm px-4 py-1 fw-medium fs-13 rounded-pill ${isUploading ? 'btn-loading' : ''}`}
                onClick={handleUpload}
                disabled={isUploading}
              >
                <i className="ri-upload-cloud-2-fill align-bottom me-1 fs-15"></i> Iniciar Procesamiento
              </button>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );

  const renderFoldersView = () => (
    <div id="folder-list" className="mb-2 fade-in">
      <Row className="justify-content-between align-items-center mb-4">
        <Col>
          <h5 className="card-title mb-0 fs-15 text-dark fw-medium">Carpetas</h5>
        </Col>
        <Col className="col-auto">
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm" style={{ width: "100px" }}>
              <option value="All">All</option>
            </select>
            <button className="btn btn-success btn-sm px-3">
              <i className="ri-add-line align-bottom me-1"></i> Crear Carpeta
            </button>
          </div>
        </Col>
      </Row>

      <Row id="folderlist-data">
        {folderData.map((folder) => (
          <Col xxl={3} lg={4} sm={6} className="folder-card" key={folder.id}>
            <Card className="bg-light shadow-none border-0" id={`folder-${folder.id}`} style={{ borderRadius: "8px" }}>
              <CardBody className="p-3">
                <div className="d-flex justify-content-between mb-2">
                  <div className="form-check form-check-danger fs-15">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`folderlistCheckbox_${folder.id}`}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`folderlistCheckbox_${folder.id}`}
                    ></label>
                  </div>
                  <UncontrolledDropdown direction="start">
                    <DropdownToggle
                      tag="button"
                      className="btn btn-ghost-primary btn-icon btn-sm dropdown fs-16 text-muted p-0"
                      style={{ height: "auto", width: "auto" }}
                    >
                      <i className="ri-more-2-fill align-bottom"></i>
                    </DropdownToggle>
                    <DropdownMenu>
                      <DropdownItem>Abrir</DropdownItem>
                      <DropdownItem>Renombrar</DropdownItem>
                      <DropdownItem onClick={() => setIsDetailOpen(true)}>
                        Detalles
                      </DropdownItem>
                      <DropdownItem divider />
                      <DropdownItem className="text-danger">Eliminar</DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>

                <div className="text-center my-3">
                  <div className="mb-2">
                    <i className="ri-folder-2-fill align-bottom text-warning" style={{ fontSize: "50px" }}></i>
                  </div>
                  <h6 className="fs-14 folder-name fw-medium text-dark">{folder.name}</h6>
                </div>
                
                <div className="d-flex justify-content-between mt-4 text-muted fs-12">
                  <span>
                    {folder.files} Archivos
                  </span>
                  <span>
                    {folder.size}
                  </span>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  return (
    <React.Fragment>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={t("Procesamiento de Archivos")} pageTitle={t("Apps")} />

          <div className="chat-wrapper d-lg-flex gap-1 p-1 mt-2">
            {/* Sidebar */}
            <div className="file-manager-sidebar minimal-border border-end">
              <div className="p-3 d-flex flex-column h-100">
                <div className="search-box">
                  <input
                    type="text"
                    className="form-control bg-light border-light"
                    placeholder="Buscar aquí..."
                  />
                  <i className="ri-search-2-line search-icon"></i>
                </div>
                <SimpleBar className="mt-3 file-manager-menu-scroll" style={{ height: "calc(100vh - 460px)", overflowX: "hidden" }}>
                  <ul className="list-unstyled file-manager-menu">
                    <li>
                      <a
                        data-bs-toggle="collapse"
                        href="#collapseExample"
                        role="button"
                        aria-expanded="true"
                        aria-controls="collapseExample"
                        className="text-success fw-medium"
                      >
                        <i className="ri-folder-2-line align-bottom me-2 text-success"></i>{" "}
                        <span className="file-list-link text-success">Mi Unidad</span>
                      </a>
                      <div className="collapse show" id="collapseExample">
                        <ul className="sub-menu list-unstyled ps-4 mt-2">
                          <li className="mb-2">
                            <Link to="#" className={`text-muted ${currentView === 'assets' ? 'active text-primary fw-medium' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView("assets"); }}>
                              <span className="me-2">•</span> Procesar
                            </Link>
                          </li>
                          <li className="mb-2">
                            <Link to="#" className={`text-muted ${currentView === 'traceability' ? 'active text-primary fw-medium' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView("traceability"); fetchTraceabilityData(1); }}>
                              <span className="me-2">•</span> Trazabilidad de archivos
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </li>                    
                  </ul>
                </SimpleBar>
              </div>
            </div>

            {/* Main Content */}
            <div className="file-manager-content w-100 p-4 py-0">
              <SimpleBar className="pt-4 file-manager-content-scroll" style={{ height: "calc(100vh - 185px)", overflowX: "hidden" }}>
                
                {currentView === "folders"
                  ? renderFoldersView()
                  : currentView === "assets"
                  ? renderDropzoneView()
                  : renderTraceabilityView()}
              
              </SimpleBar>
            </div>

            {/* Detail Sidebar */}
            <div
              className={`file-manager-detail-content minimal-border p-3 py-0 ${
                isDetailOpen ? "d-block" : "d-none"
              }`}
            >
              <SimpleBar className="pt-3 file-detail-content-scroll" style={{ height: "calc(100vh - 185px)", overflowX: "hidden" }}>
                <div id="document-detail">
                  <div className="border-bottom border-bottom-dashed pb-3 mb-3 d-flex align-items-center">
                    <h5 className="flex-grow-1 mb-0 text-dark fw-medium">Detalles del Archivo</h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost-danger btn-icon"
                      onClick={() => setIsDetailOpen(false)}
                    >
                      <i className="ri-close-line fs-16"></i>
                    </button>
                  </div>
                  <div className="text-center mb-3">
                    <div className="avatar-lg mx-auto mb-3">
                      <div className="avatar-title bg-warning-subtle text-warning rounded fs-24">
                        <i className="ri-folder-2-fill"></i>
                      </div>
                    </div>
                    <h5 className="fs-16 mb-1 text-dark fw-medium">Proyectos</h5>
                    <p className="text-muted mb-0">Carpeta</p>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-borderless table-sm mb-0">
                      <tbody>
                        <tr>
                          <th className="ps-0 text-dark" scope="row">Tamaño :</th>
                          <td className="text-muted text-end">4.1 GB</td>
                        </tr>
                        <tr>
                          <th className="ps-0 text-dark" scope="row">Archivos :</th>
                          <td className="text-muted text-end">345</td>
                        </tr>
                        <tr>
                          <th className="ps-0 text-dark" scope="row">Creado :</th>
                          <td className="text-muted text-end">10 Nov, 2026</td>
                        </tr>
                        <tr>
                          <th className="ps-0 text-dark" scope="row">Ruta :</th>
                          <td className="text-muted text-end">Mi Unidad/Proyectos</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </SimpleBar>
            </div>
          </div>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default Folders;
