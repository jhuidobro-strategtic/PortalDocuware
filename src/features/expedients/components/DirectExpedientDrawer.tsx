import React, { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Input, Label, Offcanvas, OffcanvasBody, OffcanvasHeader, Spinner } from "reactstrap";
import { hasPermission } from "../../../helpers/portal-access";
import { buildApiUrl } from "../../../helpers/api-url";
import type { Document } from "../../documents/types/list.types";
import { directRequest, DirectRequest, directStatuses } from "../directAdmission";

interface Props { document?: Document; requestId?: number; onClose: () => void; onChanged?: () => void; }
interface Approver { id: number; name: string; level: string; }
export default function DirectExpedientDrawer({ document, requestId, onClose, onChanged }: Props) {
  const [rows, setRows] = useState<DirectRequest[]>([]); const [approvers, setApprovers] = useState<Approver[]>([]);
  const [savedDoc, setSavedDoc] = useState(document); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const guard = useRef(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [reason, setReason] = useState("");
  const [junior, setJunior] = useState(""); const [senior, setSenior] = useState(""); const [support, setSupport] = useState<File | null>(null);
  const [decision, setDecision] = useState<{ id: number; action: string } | null>(null); const [comment, setComment] = useState("");
  const documentId = document?.documentid;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    const load = async () => {
      try {
        const [requests, signers] = await Promise.all([
          requestId ? directRequest<DirectRequest>(`direct-expedient-requests/${requestId}/`, undefined, controller.signal).then(row => [row]) : directRequest<DirectRequest[]>(`direct-expedient-requests/?document_id=${documentId}`, undefined, controller.signal),
          !requestId && hasPermission("expedients.send_without_order") ? directRequest<Approver[]>("direct-expedient-approvers/", undefined, controller.signal) : Promise.resolve([]),
        ]);
        if (!controller.signal.aborted) { setRows(requests); setApprovers(signers); }
        if (documentId) {
          const response = await fetch(buildApiUrl(`documents/${documentId}/`), { signal: controller.signal }); const payload = await response.json();
          if (!response.ok) throw new Error("No fue posible consultar la factura guardada.");
          if (!controller.signal.aborted) setSavedDoc(payload.data);
        }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No fue posible cargar el envío."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [documentId, requestId]);
  const run = async (path: string, body: object | FormData) => {
    if (guard.current) return; guard.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      const result = await directRequest<DirectRequest>(path, body); setRows(previous => [result, ...previous.filter(row => row.id !== result.id)]);
      setDecision(null); setComment(""); setSuccess(result.status === "APPROVED" ? `Envío aprobado. Expediente #${result.expediente_id} creado sin OC/OS.` : "Operación registrada en el historial del envío."); onChanged?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible guardar el envío."); }
    finally { guard.current = false; setBusy(false); }
  };
  const send = () => {
    if (!savedDoc || !reason.trim() || !senior) return;
    const data = new FormData(); data.set("document_id", String(savedDoc.documentid)); data.set("reason", reason); data.set("senior_id", senior);
    if (junior) data.set("junior_id", junior); if (support) data.set("support_file", support);
    void run("direct-expedient-requests/", data);
  };
  const active = rows.some(row => row.status !== "REJECTED") || Boolean(savedDoc?.direct_admission);
  return <Offcanvas isOpen direction="end" toggle={busy ? undefined : onClose} keyboard={!busy} style={{ width: "min(1100px, 96vw)" }}>
    <OffcanvasHeader toggle={busy ? undefined : onClose}>Enviar a Expedientes sin OC/OS</OffcanvasHeader><OffcanvasBody>
      {error && <Alert color="danger" fade={false}>{error}</Alert>}{success && <Alert color="success" fade={false}>{success}</Alert>}
      {loading ? <p role="status"><Spinner tag="span" size="sm" /> Cargando envío…</p> : <>
        {savedDoc && <div className="bg-light rounded p-3 mb-3"><h5>{savedDoc.documentserial}-{savedDoc.documentnumber}</h5><p className="mb-1">{savedDoc.suppliername} · {savedDoc.suppliernumber}</p><strong>{savedDoc.currency} {Number(savedDoc.totalamount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong><p className="small text-muted mb-0 mt-2">Se utilizarán los datos guardados y el PDF registrado de la factura. Guarde cualquier modificación antes de iniciar un envío nuevo.</p></div>}
        {rows.map(row => <div className="border rounded p-3 mb-3" key={row.id}>
          <div className="d-flex flex-wrap justify-content-between gap-2"><strong>Envío #{row.id} · {row.snapshot.reference}</strong><Badge color={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"}>{directStatuses[row.status]}</Badge></div>
          <p className="mb-1">{row.snapshot.supplier} · {row.snapshot.currency} {Number(row.snapshot.total).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p><p className="mb-1">Motivo: {row.reason}</p><p className="text-muted small">Solicitante: {row.creator}. Firmantes: {row.junior ? `${row.junior} (Junior) / ` : ""}{row.senior} (Senior).</p>
          <div className="d-flex flex-wrap gap-3 mb-3">{row.invoice_url && <a href={row.invoice_url} target="_blank" rel="noreferrer">Ver PDF de la factura</a>}{row.support_url && <a href={row.support_url} target="_blank" rel="noreferrer">Ver sustento</a>}</div>
          {row.expediente_id && <p className="text-success fw-semibold">Expediente #{row.expediente_id} · Sin OC/OS</p>}
          <details><summary>Historial del envío</summary><ul className="mt-2">{row.events.map((event, index) => <li key={index}>{directStatuses[event.action] || event.action} · {event.actor} · {new Date(event.date).toLocaleString("es-PE")} · {event.comment}</li>)}</ul></details>
          {row.can_act && <div className="d-flex gap-2 mt-3"><Button color="success" size="sm" disabled={busy} onClick={() => { setDecision({ id: row.id, action: "approve" }); setComment(""); }}>Aprobar {row.next_level}</Button><Button color="danger" outline size="sm" disabled={busy} onClick={() => { setDecision({ id: row.id, action: "reject" }); setComment(""); }}>Rechazar</Button></div>}
          {decision?.id === row.id && <div className="bg-light rounded p-3 mt-3"><Label htmlFor="direct-comment">Comentario de la decisión</Label><Input id="direct-comment" type="textarea" maxLength={2000} disabled={busy} value={comment} onChange={event => setComment(event.target.value)} /><div className="d-flex gap-2 mt-3"><Button color="primary" disabled={busy || !comment.trim()} onClick={() => void run(`direct-expedient-requests/${row.id}/action/`, { action: decision.action, comment })}>Confirmar decisión</Button><Button color="light" disabled={busy} onClick={() => setDecision(null)}>Cancelar</Button></div></div>}
        </div>)}
        {!requestId && savedDoc && !active && hasPermission("expedients.send_without_order") && <div className="border rounded p-3">
          <h5>Solicitar aprobación directa</h5><p>El expediente se creará al completar las firmas. No se generará una OC/OS.</p>
          <Label htmlFor="direct-reason">Motivo por el que no requiere OC/OS</Label><Input id="direct-reason" type="textarea" maxLength={2000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} />
          <div className="row g-3 mt-1"><div className="col-md-6"><Label htmlFor="direct-junior">Firmante Junior (opcional)</Label><Input id="direct-junior" type="select" value={junior} disabled={busy} onChange={event => setJunior(event.target.value)}><option value="">Sin Junior</option>{approvers.filter(row => row.level === "JR").map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</Input></div><div className="col-md-6"><Label htmlFor="direct-senior">Firmante Senior</Label><Input id="direct-senior" type="select" value={senior} disabled={busy} onChange={event => setSenior(event.target.value)}><option value="">Seleccione al responsable</option>{approvers.filter(row => row.level === "SENIOR").map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</Input></div></div>
          {!approvers.some(row => row.level === "SENIOR") && <p className="text-warning mt-2">No hay un Senior habilitado. Un Superadmin debe asignar el permiso “Aprobar envíos sin OC/OS”.</p>}
          <Label htmlFor="direct-support" className="mt-3">Sustento adicional (PDF opcional, máximo 20 MB)</Label><Input id="direct-support" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => setSupport(event.target.files?.[0] || null)} />
          <Button className="mt-3" color="primary" disabled={busy || !reason.trim() || !senior || Boolean(savedDoc.hasActiveOrder)} onClick={send}>{busy ? "Enviando…" : "Enviar a aprobación sin OC/OS"}</Button>
        </div>}
        {active && !rows.length && <Alert color="warning" fade={false}>Esta factura ya tiene un envío sin OC/OS. Consulte al solicitante o a los firmantes asignados para revisar el registro.</Alert>}
      </>}
    </OffcanvasBody>
  </Offcanvas>;
}
