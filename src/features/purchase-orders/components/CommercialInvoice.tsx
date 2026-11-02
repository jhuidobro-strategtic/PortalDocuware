import React, { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import { getApiErrorMessage } from "../../../helpers/api-error-message";
import type { Document } from "../../documents/types/list.types";
import OrderDocumentItem from "./OrderDocumentItem";

interface Props {
  orderId: number;
  invoiceId?: number;
  userId: number | null;
  name: string;
  url: string;
  createdAt?: string;
  canReplace: boolean;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  onReplaced: (document: Document) => Promise<void>;
}

const CommercialInvoice = ({ orderId, invoiceId, userId, name, url, createdAt,
  canReplace, disabled = false, onBusyChange, onReplaced }: Props) => {
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submitting = useRef(false);
  const fileId = `commercial-invoice-${orderId}`;
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const replace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || disabled || !canReplace || !file || !invoiceId || !userId) return;
    submitting.current = true;
    setBusy(true); onBusyChange(true); setError(""); setSuccess("");
    const body = new FormData();
    body.append("document_id", String(invoiceId));
    body.append("updated_by", String(userId));
    body.append("file", file);
    try {
      const response = await fetch(buildApiUrl(`purchase-orders/${orderId}/commercial-invoice/`), {
        method: "POST", body,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result.data?.documentid) {
        throw new Error(getApiErrorMessage(result, "No fue posible sustituir la factura comercial."));
      }
      setFile(null); setEditing(false);
      setSuccess("Factura comercial sustituida correctamente.");
      try { await onReplaced(result.data); }
      catch { setError("La factura se sustituyó, pero no se pudo actualizar el listado. Cierre y vuelva a abrir el panel."); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No fue posible sustituir la factura comercial.");
    } finally {
      submitting.current = false; setBusy(false); onBusyChange(false);
    }
  };

  return <section aria-label="Factura comercial">
    <OrderDocumentItem name={name} type="Factura comercial" url={url} createdAt={createdAt}
      previewLabel="Ver factura comercial" />
    <div className="d-flex flex-wrap align-items-center gap-2 my-3">
      <Button type="button" color="light" disabled={disabled || busy || !canReplace || !invoiceId}
        onClick={() => { setEditing((value) => !value); setError(""); setSuccess(""); setFile(null); }}
        aria-expanded={editing} aria-controls={`${fileId}-form`}>
        <i className="ri-file-edit-line me-1" aria-hidden="true" />Sustituir factura comercial
      </Button>
      {!canReplace && <span className="small text-muted">Disponible para el solicitante y los firmantes asignados antes de la primera firma.</span>}
    </div>
    {error && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
    {success && <div className="alert alert-success" role="status">{success}</div>}
    {editing && <form id={`${fileId}-form`} className="expedient-upload-panel mb-3" onSubmit={replace}>
      <p>Seleccione el PDF de la misma factura para sustituir el archivo actual. Los datos registrados de la factura se conservarán.</p>
      <label htmlFor={fileId} className="form-label">Nueva factura comercial (PDF)</label>
      <input id={fileId} type="file" accept="application/pdf,.pdf" className="form-control" required
        disabled={busy || disabled || !canReplace} onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          setError("");
          if (selected && !/\.pdf$/i.test(selected.name)) {
            event.target.value = ""; setFile(null); setError("Seleccione un archivo PDF.");
          } else setFile(selected);
        }} />
      {preview && <div className="expedient-inline-preview mt-3">
        <div className="expedient-preview-surface"><iframe className="expedient-preview-iframe"
          src={preview} title="Vista previa de la nueva factura comercial" /></div>
      </div>}
      <div className="d-flex flex-wrap gap-2 mt-3">
        <Button type="submit" color="primary" disabled={busy || disabled || !canReplace || !file || !userId}>
          {busy && <Spinner size="sm" className="me-2" />}{busy ? "Sustituyendo..." : "Confirmar sustitución"}
        </Button>
        <Button type="button" color="light" disabled={busy || disabled}
          onClick={() => { setEditing(false); setFile(null); setError(""); }}>Cancelar</Button>
      </div>
    </form>}
  </section>;
};
export default CommercialInvoice;
