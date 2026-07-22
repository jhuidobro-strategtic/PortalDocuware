import React, { useState, useCallback } from "react";
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
  const [currentView, setCurrentView] = useState<"folders" | "assets">("folders");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
                              <span className="me-2"></span> Procesar
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
            <div className="file-manager-content minimal-border w-100 p-4 py-0">
              <SimpleBar className="pt-4 file-manager-content-scroll" style={{ height: "calc(100vh - 185px)", overflowX: "hidden" }}>
                
                {currentView === "folders" ? renderFoldersView() : renderDropzoneView()}
              
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
