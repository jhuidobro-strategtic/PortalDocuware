import React, { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { Alert, Button, Col, Row, Spinner, Table } from "reactstrap";
import { getPreferenceUserId } from "../../helpers/ui-preferences";
import { api } from "./services";
import { PreOrder, stateLabels } from "./types";
import "../folders/views/Folders.css";

interface FileJob { id: number; file: File; state: "pending" | "processing" | "error" | "saved"; row?: PreOrder; error?: string; blocked?: boolean; }
const PreOrderProcessing = () => {
  const [jobs, setJobs] = useState<FileJob[]>([]); const [processing, setProcessing] = useState(false);
  const [selectionError, setSelectionError] = useState(""); const fileCounter = useRef(0); const alive = useRef(true);
  const [result, setResult] = useState<{ saved: number; review: number; failures: { name: string; message: string }[] } | null>(null);
  const userId = Number(getPreferenceUserId());
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const update = (id: number, values: Partial<FileJob>) => { if (alive.current) setJobs((previous) => previous.map((job) => job.id === id ? { ...job, ...values } : job)); };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] }, multiple: true, disabled: processing,
    onDrop: (files, rejected) => {
      setResult(null);
      setSelectionError(rejected.length ? "Solo se permiten archivos PDF." : "");
      setJobs((previous) => [...previous, ...files.filter((file) => !previous.some((job) => job.file.name === file.name && job.file.size === file.size && job.file.lastModified === file.lastModified))
        .map((file) => ({ id: ++fileCounter.current, file, state: "pending" as const }))]);
    },
  });
  const process = async () => {
    if (!userId) { setSelectionError("No fue posible identificar al usuario."); return; }
    setProcessing(true); setSelectionError(""); setResult(null);
    let saved = 0; let review = 0;
    const failures: { name: string; message: string }[] = [];
    try {
      for (const job of jobs.filter((item) => item.state === "pending" || (item.state === "error" && !item.blocked))) {
        if (!alive.current) break;
        update(job.id, { state: "processing", error: "" });
        const body = new FormData(); body.append("userID", String(userId)); body.append("file", job.file);
        try {
          const row = await api<PreOrder>("pre-orders/import/", { method: "POST", body });
          update(job.id, { state: "saved", row });
          saved += 1;
          if (row.missing_fields?.length || row.order_data.extraction?.warnings?.length) review += 1;
        } catch (failure) {
          const error = failure instanceof Error ? failure.message : "No fue posible registrar el archivo.";
          failures.push({ name: job.file.name, message: error });
          update(job.id, { state: "error", error, blocked: /comprobante de pago|procesar comprobantes/i.test(error) });
        }
      }
    } finally {
      if (alive.current) { setProcessing(false); setResult({ saved, review, failures }); }
    }
  };
  return <section className="mb-2 fade-in">
    <Row className="justify-content-between align-items-center mb-4">
      <Col><h4 className="mb-sm-0 text-primary fw-bold fs-16">Subida de Pre-Órdenes</h4>
        <p className="text-muted mb-0 mt-1 fs-13">Carga cotizaciones, proformas, cartas u otros sustentos PDF. Al completar el procesamiento aparecerán automáticamente en Pre-Órdenes. Los datos faltantes se completan desde Editar.</p></Col>
      <Col className="col-auto"><Link to="/pre-orders" className="btn btn-sm btn-soft-secondary rounded-pill"><i className="ri-arrow-right-line align-bottom me-1" />Ver Pre-Órdenes</Link></Col>
    </Row>
    {result && <Alert color={result.failures.length ? (result.saved ? "warning" : "danger") : result.review ? "warning" : "success"} toggle={() => setResult(null)} role="alert">
      <strong>{result.failures.length ? "Procesamiento finalizado con errores." : "Procesamiento completado correctamente."}</strong>
      <div>{result.saved} documento(s) registrado(s) en Pre-Órdenes. {result.failures.length > 0 && `${result.failures.length} documento(s) no se pudieron registrar.`}</div>
      {result.review > 0 && <div>{result.review} documento(s) registrado(s) requieren revisar la extracción o completar datos desde Editar antes de enviarlos al Senior.</div>}
      {!!result.failures.length && <ul className="mb-0 mt-2">{result.failures.map((failure, index) => <li key={index}><strong>{failure.name}:</strong> {failure.message}</li>)}</ul>}
    </Alert>}
    {selectionError && <div className="alert alert-warning" role="alert">{selectionError}</div>}
    <Row><Col lg={12}>
      <div {...getRootProps()} className={`premium-dropzone ${isDragActive ? "active" : ""}`} style={{ minHeight: 300 }}>
        <input {...getInputProps()} aria-label="Documentos PDF para preórdenes" />
        {!jobs.length ? <div className="premium-dropzone-content">
          <div className="dropzone-icon-wrapper"><i className="ri-cloud-windy-line dropzone-icon" /></div>
          <h4 className="dropzone-title">Arrastra y suelta tus documentos aquí</h4>
          <p className="dropzone-text">o haz clic para explorar en tu computadora</p>
          <div className="dropzone-badges mt-3"><span className="badge bg-primary-subtle text-primary">PDF</span></div>
        </div> : <div className="premium-dropzone-content text-start w-100 h-100 d-flex flex-column">
          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-4">
            <div><h5 className="text-dark fw-bold mb-1">Archivos en Cola ({jobs.length})</h5><p className="text-muted fs-13 mb-0">Puedes seguir arrastrando más documentos aquí dentro o hacer clic en el fondo blanco.</p></div>
            <button type="button" className="btn btn-sm btn-soft-danger rounded-pill" disabled={processing} onClick={(event) => { event.stopPropagation(); setJobs([]); setResult(null); }}><i className="ri-delete-bin-line align-bottom me-1" />Limpiar lista</button>
          </div>
          <div className={`premium-file-list flex-grow-1 ${processing ? "processing-state" : ""}`}>
            {jobs.map((job) => <div key={job.id} className="premium-file-item d-flex align-items-center bg-white" onClick={(event) => event.stopPropagation()}>
              <div className="file-icon-box flex-shrink-0" style={{ width: 35, height: 35, fontSize: 18 }}><i className="ri-file-pdf-fill" /></div>
              <div className="file-details flex-grow-1 overflow-hidden ms-3"><h5 className="fs-13 mb-1 text-truncate text-dark fw-medium" title={job.file.name}>{job.file.name}</h5><p className="text-muted mb-0 fs-12">{(job.file.size / 1024 / 1024).toFixed(2)} MB</p></div>
              <div className="file-actions ms-3"><button type="button" className="btn btn-sm btn-ghost-danger btn-icon rounded-circle" disabled={processing} aria-label={`Quitar ${job.file.name}`} onClick={(event) => { event.stopPropagation(); setJobs((previous) => previous.filter((item) => item.id !== job.id)); }}><i className="ri-close-line fs-16" /></button></div>
            </div>)}
          </div>
        </div>}
      </div>
    </Col></Row>
    {!!jobs.length && <Row className="mt-3 mb-3 fade-in-up"><Col lg={12} className="text-end">
      <Button color="primary" className="shadow-sm px-4 py-1 fw-medium fs-13 rounded-pill" disabled={processing || !jobs.some((job) => job.state === "pending" || (job.state === "error" && !job.blocked))} onClick={process}>
        {processing ? <Spinner size="sm" className="me-2" /> : <i className="ri-upload-cloud-2-fill align-bottom me-1 fs-15" />}{processing ? "Leyendo y registrando..." : "Iniciar Procesamiento"}
      </Button>
    </Col></Row>}
    {jobs.some((job) => job.state !== "pending") && <div className="table-responsive"><Table className="align-middle"><thead className="table-light"><tr><th>Archivo</th><th>Estado / registro</th><th>Acciones</th></tr></thead><tbody>
      {!jobs.length && <tr><td colSpan={3} className="text-center py-4 text-muted">Agregue sus documentos para iniciar la lectura.</td></tr>}
      {jobs.map((job) => <tr key={job.id}><td><div className="text-break">{job.file.name}</div><small className="text-muted">{(job.file.size / 1024).toFixed(1)} KB</small></td>
        <td>{job.state === "processing" ? <><Spinner size="sm" className="me-2" />Leyendo y registrando</>
          : job.state === "saved" ? <><span className="badge bg-success-subtle text-success">Preorden #{job.row?.id} registrada</span>
            <small className="d-block mt-1">{job.row && stateLabels[job.row.status]}</small>
            {!!job.row?.missing_fields?.length && <small className="d-block text-muted">Completar: {job.row.missing_fields.join(", ")}</small>}</>
            : job.state === "error" ? <span className="text-danger">{job.error}</span> : "En cola"}
          {job.row && <small className="d-block text-muted mt-1">{job.row.source_kind} {job.row.source_reference} · {job.row.order_data.extraction?.currency || "Moneda por confirmar"} {job.row.order_data.total || ""} · {job.row.order_data.details.length} líneas</small>}
        </td><td><div className="d-flex flex-wrap gap-2">
          {job.state === "saved" ? <><Link to="/pre-orders" className="btn btn-sm btn-light">Ver en Pre-Órdenes</Link>
            {job.row?.status === "DRAFT" && <Link to={`/pre-orders/edit/${job.row.id}`} className="btn btn-sm btn-primary">Editar y completar</Link>}</>
            : <Button size="sm" color="light" disabled={processing} onClick={() => setJobs((previous) => previous.filter((item) => item.id !== job.id))} aria-label={`Quitar ${job.file.name}`}><i className="ri-delete-bin-line text-danger" /></Button>}
        </div></td></tr>)}
    </tbody></Table></div>}
  </section>;
};
export default PreOrderProcessing;
