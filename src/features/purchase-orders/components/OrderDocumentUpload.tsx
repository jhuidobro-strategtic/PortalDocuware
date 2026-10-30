import React, { useRef, useState } from "react";
import { Button, Spinner } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import { getApiErrorMessage } from "../../../helpers/api-error-message";

interface Props {
  orderId: number;
  invoiceId?: number;
  userId: number | null;
  token?: string | null;
  onUploaded: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}

const OrderDocumentUpload = ({ orderId, invoiceId, userId, token, onUploaded, onBusyChange }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(""); setSuccess("");
    if (!file) { setError("Seleccione un archivo PDF."); return; }
    if (!userId) { setError("No fue posible identificar al usuario. Inicie sesión nuevamente."); return; }
    setBusy(true); onBusyChange(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    try {
      const response = await fetch(buildApiUrl("expedientes/"), { headers });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) throw new Error(getApiErrorMessage(result, "No fue posible consultar el expediente."));
      const rows = result?.data ?? result;
      if (!Array.isArray(rows)) throw new Error("El servidor no devolvió un listado válido de expedientes.");
      const related = rows.filter((row) => Number(row.ordencompraid ?? row.ordencompra?.purchaseOrderID) === orderId && row.estado !== false);
      const expediente = related.find((row) => ![true, 1, "1", "true"].includes(row.lock_exp));
      if (related.length && !expediente) throw new Error("El expediente está cerrado y no permite agregar documentos.");
      const body = new FormData();
      body.append("createdby", String(userId));
      if (expediente) {
        body.append("tipodocumentoid", type); body.append("file", file);
      } else {
        body.append("ordencompraid", String(orderId));
        if (invoiceId) body.append("facturaid", String(invoiceId));
        body.append("support_file", file);
        body.append("expediente_documentos", JSON.stringify([{ tipodocumentoid: Number(type), file_field: "support_file", estado: true, createdby: userId }]));
      }
      const saved = await fetch(buildApiUrl(expediente ? `expedientes/${expediente.expedienteid}/documentos/` : "expedientes/"), { method: "POST", headers, body });
      const payload = await saved.json().catch(() => null);
      if (!saved.ok || payload?.success === false) throw new Error(getApiErrorMessage(payload, "No fue posible subir el documento."));
      setFile(null); if (input.current) input.current.value = "";
      setSuccess("Documento cargado correctamente.");
      try { await onUploaded(); }
      catch { setError("El documento se cargó, pero no se pudo actualizar el listado. Cierre y vuelva a abrir el panel."); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible subir el documento."); }
    finally { setBusy(false); onBusyChange(false); }
  };
  return <form className="expedient-upload-panel" onSubmit={upload}>
    <div className="expedient-upload-panel-header"><div>
      <span className="expedient-upload-panel-kicker">Nuevo documento</span><h6 className="mb-1">Subir PDF</h6>
      <p className="text-muted mb-0">Adjunte liquidaciones y otros documentos de sustento vinculados a la factura. No necesita esperar la firma de la orden.</p>
    </div></div>
    {error && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
    {success && <div className="alert alert-success" role="status">{success}</div>}
    <div className="expedient-upload-grid">
      <div className="expedient-upload-field"><label htmlFor="order-upload-type" className="expedient-upload-label">Tipo de documento <span className="text-danger">*</span></label>
        <select id="order-upload-type" className="form-select" value={type} disabled={busy} onChange={(event) => setType(event.target.value)}>
          <option value="3">Documento de sustento</option><option value="1">Factura</option>
        </select>
      </div>
      <div className="expedient-upload-field expedient-upload-field-file"><label className="expedient-upload-label" htmlFor="order-upload-file">Archivo PDF <span className="text-danger">*</span></label>
        <input ref={input} id="order-upload-file" type="file" accept="application/pdf,.pdf" className="d-none" disabled={busy} onChange={(event) => {
          const selected = event.target.files?.[0] ?? null; setError(""); setSuccess("");
          if (selected && selected.type !== "application/pdf" && !/\.pdf$/i.test(selected.name)) {
            setFile(null); event.target.value = ""; setError("Solo se permiten archivos PDF.");
          } else setFile(selected);
        }} />
        <button type="button" className="expedient-upload-dropzone" disabled={busy} onClick={() => input.current?.click()}>
          <span className="expedient-upload-dropzone-icon"><i className="ri-file-upload-line" /></span>
          <span className="expedient-upload-dropzone-copy"><strong>{file?.name || "Seleccionar archivo PDF"}</strong><small>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Haga clic para buscar el archivo."}</small></span>
        </button>
      </div>
      <div className="expedient-upload-actions"><Button color="primary" type="submit" className="expedient-upload-submit-button" disabled={busy || !file}>
        {busy ? <Spinner size="sm" className="me-2" /> : <i className="ri-upload-cloud-2-line me-2" />}{busy ? "Subiendo..." : "Subir documento"}
      </Button></div>
    </div>
  </form>;
};
export default OrderDocumentUpload;
