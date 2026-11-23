import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, CardBody, Table } from "reactstrap";
import { hasPermission } from "../../helpers/portal-access";
import CreditReservationPicker from "./CreditReservationPicker";
import { CreditApplication, CreditPick, creditRequest, money } from "./service";

export default function OrderCreditManager({ orderId, ruc, currency, locked, onChanged, onBusyChange }: { orderId: number; ruc: string; currency: string; locked: boolean; onChanged?: () => void; onBusyChange?: (busy: boolean) => void; }) {
  const [rows, setRows] = useState<CreditApplication[]>([]); const [picks, setPicks] = useState<CreditPick[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
  const submitting = useRef(false);
  const load = useCallback(async () => { setRows(await creditRequest<CreditApplication[]>(`purchase-orders/${orderId}/credits/`)); }, [orderId]);
  useEffect(() => { void load().catch(failure => setError(failure.message)); }, [load]);
  const save = async () => {
    if (submitting.current) return; submitting.current = true;
    setBusy(true); onBusyChange?.(true); setError("");
    try { await creditRequest(`purchase-orders/${orderId}/credits/`, { reservations: picks }); setPicks([]); setRevision(value => value + 1); await load(); onChanged?.(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible reservar."); }
    finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <Card className="border shadow-none"><CardBody><h5>Saldos a favor aplicados a esta orden</h5>
    {error && <Alert color="danger" fade={false}>{error}</Alert>}
    {!rows.length ? <p className="text-muted">No hay reservas ni aplicaciones registradas.</p> : <Table responsive><thead><tr><th>Origen</th><th>Importe</th><th>Estado</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>Expediente #{row.source_id}</td><td>{currency} {money(row.amount)}</td><td>{{ RESERVED: "Reservado", APPLIED: "Aplicado", RELEASED: "Liberado", REVERSED: "Revertido" }[row.status] || row.status}</td></tr>)}</tbody></Table>}
    {!locked && hasPermission("credits.reserve") && <><CreditReservationPicker key={revision} ruc={ruc} currency={currency} value={picks} onChange={setPicks} disabled={busy} /><Button color="primary" disabled={busy || !picks.length} onClick={() => void save()}>{busy ? "Reservando…" : "Reservar saldo para esta orden"}</Button></>}
  </CardBody></Card>;
}
