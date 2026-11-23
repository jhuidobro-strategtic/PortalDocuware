import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, Input, Label, Spinner, Table } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import { getApiErrorMessage } from "../../../helpers/api-error-message";
import { hasPermission } from "../../../helpers/portal-access";

export interface FinancialSummary {
  credit_received?: string; credit_transferred?: string; credit_refunded?: string; credit_reserved?: string; credit_available?: string; reserved_for_payment?: string; cash_due?: string;
  original_total: string; approved_debits: string; approved_credits: string; adjusted_total: string;
  adjusted_net: string; settled_amount: string; balance: string; pending_adjustments: number; payment_status: string;
}
interface Adjustment {
  file_url?: string;
  id: number; expediente_id: number; order_number: string; invoice_reference: string; kind: string; reference: string;
  currency: string; amount: string; net_amount: string; reason: string; status: string; created_by: string;
  junior_name: string; senior_name: string; next_level: string; can_approve: boolean;
  events: { action: string; actor: string; comment: string; created_at: string }[];
}
interface Note { id: number; kind: string; reference: string; currency: string; amount: string; date: string; }
interface Props { expedientId?: number; invoiceReference?: string; closed?: boolean; onChanged?: () => void; onBusyChange?: (busy: boolean) => void; }
const statuses: Record<string, string> = { PENDING: "Pendiente de firmas", JR_SIGNED: "Firmado Junior · pendiente Senior", APPROVED: "Aprobado", REJECTED: "Rechazado", CREATED: "Registrado" };
const money = (value: string) => Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function requestData(path: string, body?: object) {
  const response = await fetch(buildApiUrl(path), body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(getApiErrorMessage(result, "No fue posible gestionar el ajuste."));
  return result.data;
}

export default function ExpedientAdjustments({ expedientId, invoiceReference = "", closed = false, onChanged, onBusyChange }: Props) {
  const [rows, setRows] = useState<Adjustment[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<{ amount: string; actor: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const guard = useRef(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const [linking, setLinking] = useState(false); const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false); const [kind, setKind] = useState(""); const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(""); const [reason, setReason] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const [decision, setDecision] = useState<{ row: Adjustment; action: string } | null>(null); const [comment, setComment] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await requestData(expedientId ? `expedientes/${expedientId}/adjustments/` : "expedient-adjustments/");
      setRows(expedientId ? result.adjustments : result); setSummary(expedientId ? result.financial_summary : null);
      setPayments(expedientId ? result.payment_history || [] : []);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible cargar los ajustes."); }
    finally { setLoading(false); }
  }, [expedientId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!linking || !expedientId) return;
    const controller = new AbortController(); setNotesLoading(true); setSelected(""); setNotes([]);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(buildApiUrl(`expedientes/${expedientId}/adjustments/available-notes/?${new URLSearchParams({ kind, search })}`), { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(getApiErrorMessage(result, "No fue posible cargar las notas."));
        if (!controller.signal.aborted) { setNotes(result.data); setError(""); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No fue posible cargar las notas."); }
      finally { if (!controller.signal.aborted) setNotesLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [linking, expedientId, kind, search]);
  const mutate = async (path: string, body: object) => {
    if (guard.current) return;
    guard.current = true; setBusy(true); onBusyChange?.(true); setError(""); setSuccess("");
    try {
      await requestData(path, body); setLinking(false); setSelected(""); setReason(""); setConfirmed(false); setDecision(null); setComment("");
      setSuccess("Operación registrada. La OC/OS original y sus firmas se conservan."); await load(); onChanged?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible guardar el ajuste."); }
    finally { guard.current = false; setBusy(false); onBusyChange?.(false); }
  };
  if (!expedientId && !loading && !error && !rows.length) return null;
  return <Card className="border shadow-none"><CardBody>
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div><h5 className="mb-1">{expedientId ? "Ajustes de la orden · NC / ND" : "NC / ND pendientes de aprobación"}</h5><p className="text-muted mb-0">Los ajustes tienen firmas e historial propios. Solo los aprobados afectan el saldo.</p></div>
      <Button color="light" size="sm" disabled={busy || loading} onClick={() => void load()}>Actualizar</Button>
    </div>
    {error && <Alert color="danger" fade={false}>{error}</Alert>}{success && <Alert color="success" fade={false}>{success}</Alert>}
    {closed && <Alert color="warning" fade={false}>El expediente está cerrado. Debe reabrirse con autorización para registrar o aprobar ajustes.</Alert>}
    {summary && <div className="row g-3 mb-3">{[
      ["Factura original", summary.original_total], ["ND aprobadas (+)", summary.approved_debits], ["NC aprobadas (−)", summary.approved_credits],
      ["Total ajustado", summary.adjusted_total], ["Neto ajustado", summary.adjusted_net], ["Pagos registrados", summary.settled_amount], ["Saldo pendiente / a favor (−)", summary.balance],
      ["Saldo aplicado de otros documentos", summary.credit_received || "0"], ["Saldo transferido a otras facturas", summary.credit_transferred || "0"], ["Dinero devuelto por proveedor", summary.credit_refunded || "0"],
    ].map(([label, value]) => <div key={label} className="col-6 col-lg-3"><div className="bg-light rounded p-3 h-100"><small className="text-muted d-block">{label}</small><strong>{money(value)}</strong></div></div>)}</div>}
    {payments.length > 0 && <details className="mb-3"><summary>Historial de pagos</summary><ul className="mt-2">{payments.map((payment, index) => <li key={index}>{money(payment.amount)} · {payment.actor} · {new Date(payment.created_at).toLocaleString("es-PE")}</li>)}</ul></details>}
    {loading ? <div role="status"><Spinner size="sm" /> Cargando ajustes…</div> : <>
      {!rows.length && <p className="text-muted">No hay NC/ND vinculadas a esta orden.</p>}
      {rows.map(row => <div key={row.id} className="border rounded p-3 mb-3">
        <div className="d-flex flex-wrap justify-content-between gap-2"><strong>{row.kind} · {row.reference}</strong><Badge color={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"}>{statuses[row.status]}</Badge></div>
        <p className="mb-1">{row.order_number} · Factura {row.invoice_reference} · {row.currency} {money(row.amount)}</p>
        {row.file_url && <a href={row.file_url} target="_blank" rel="noreferrer" className="d-inline-block mb-2">Ver PDF de la {row.kind}</a>}
        <p className="mb-1">Motivo: {row.reason}</p><p className="text-muted small">Registrado por {row.created_by}. Firmantes: {row.junior_name ? `${row.junior_name} (Junior) / ` : ""}{row.senior_name} (Senior).</p>
        <details><summary>Ver historial</summary><ul className="mt-2">{row.events.map((event, index) => <li key={index}>{statuses[event.action] || event.action} · {event.actor} · {new Date(event.created_at).toLocaleString("es-PE")} · {event.comment}</li>)}</ul></details>
        {row.can_approve && !closed && <div className="d-flex gap-2 mt-3"><Button size="sm" color="success" disabled={busy} onClick={() => { setDecision({ row, action: "approve" }); setComment(""); }}>Aprobar {row.next_level}</Button><Button size="sm" color="danger" outline disabled={busy} onClick={() => { setDecision({ row, action: "reject" }); setComment(""); }}>Rechazar</Button></div>}
        {decision?.row.id === row.id && <div className="bg-light rounded p-3 mt-3"><Label htmlFor={`adjustment-comment-${row.id}`}>Comentario de {decision.action === "approve" ? "aprobación" : "rechazo"}</Label><Input id={`adjustment-comment-${row.id}`} type="textarea" maxLength={2000} disabled={busy} value={comment} onChange={event => setComment(event.target.value)} /><div className="d-flex gap-2 mt-2"><Button color="primary" disabled={busy || !comment.trim()} onClick={() => void mutate(`expedientes/${row.expediente_id}/adjustments/${row.id}/action/`, { action: decision.action, comment })}>{busy ? "Guardando…" : "Confirmar decisión"}</Button><Button color="light" disabled={busy} onClick={() => setDecision(null)}>Cancelar</Button></div></div>}
      </div>)}
    </>}
    {expedientId && hasPermission("expedients.link_note") && !closed && !linking && <Button color="primary" disabled={busy} onClick={() => setLinking(true)}>Vincular NC / ND</Button>}
    {linking && <div className="border rounded p-3 mt-3">
      <h6>Seleccionar nota registrada</h6><p className="text-muted">Mismo proveedor y moneda. Verifique en el PDF que la nota afecta a la factura {invoiceReference}. Se anexará al expediente y quedará pendiente de firmas.</p>
      <div className="row g-2"><div className="col-md-4"><Label htmlFor="adjustment-kind">Tipo</Label><Input id="adjustment-kind" type="select" value={kind} disabled={busy} onChange={event => setKind(event.target.value)}><option value="">NC y ND</option><option value="NC">Nota de crédito</option><option value="ND">Nota de débito</option></Input></div><div className="col-md-8"><Label htmlFor="adjustment-search">Buscar serie o número</Label><Input id="adjustment-search" value={search} disabled={busy} onChange={event => setSearch(event.target.value)} /></div></div>
      {notesLoading ? <p className="mt-3"><Spinner tag="span" size="sm" /> Buscando…</p> : <div className="table-responsive mt-3"><Table><thead><tr><th>Vincular</th><th>Nota</th><th>Fecha</th><th>Importe</th></tr></thead><tbody>{!notes.length && <tr><td colSpan={4}>No hay notas disponibles para estos filtros.</td></tr>}{notes.map(note => <tr key={note.id}><td><Input type="radio" name="adjustment-note" aria-label={`Seleccionar ${note.reference}`} disabled={busy} checked={selected === String(note.id)} onChange={() => setSelected(String(note.id))} /></td><td>{note.kind} · {note.reference}</td><td>{note.date}</td><td>{note.currency} {money(note.amount)}</td></tr>)}</tbody></Table></div>}
      <Label htmlFor="adjustment-reason">Motivo del ajuste</Label><Input id="adjustment-reason" type="textarea" maxLength={2000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} />
      <Label check className="d-block mt-3"><Input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /> Confirmo que la nota seleccionada corresponde a la factura {invoiceReference}.</Label>
      <div className="d-flex flex-wrap gap-2 mt-3"><Button color="primary" disabled={busy || notesLoading || !selected || !reason.trim() || !confirmed} onClick={() => void mutate(`expedientes/${expedientId}/adjustments/`, { note_id: Number(selected), reason, invoice_reference: invoiceReference })}>{busy ? "Guardando…" : "Anexar y enviar a aprobación"}</Button><Button color="light" disabled={busy} onClick={() => setLinking(false)}>Cancelar</Button></div>
    </div>}
  </CardBody></Card>;
}
