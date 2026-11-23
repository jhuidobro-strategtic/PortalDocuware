import React, { useEffect, useState } from "react";
import { Alert, Input, Label, Spinner } from "reactstrap";
import { hasPermission } from "../../helpers/portal-access";
import { CreditPick, CreditSource, creditRequest, money } from "./service";

interface Props { ruc: string; currency?: string; value?: CreditPick[]; onChange?: (value: CreditPick[]) => void; disabled?: boolean; }
export default function CreditReservationPicker({ ruc, currency = "", value = [], onChange, disabled }: Props) {
  const [sources, setSources] = useState<CreditSource[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    setSources([]); setError(""); setLoading(false); onChange?.([]);
    if (!ruc.trim()) return;
    const controller = new AbortController(); setLoading(true);
    const query = new URLSearchParams({ ruc: ruc.trim(), currency, available: "1" });
    void creditRequest<CreditSource[]>(`supplier-credits/?${query}`, undefined, controller.signal).then(data => { if (!controller.signal.aborted) setSources(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ruc, currency, onChange]);
  if (loading) return <p className="text-muted"><Spinner tag="span" size="sm" /> Consultando saldos del proveedor…</p>;
  if (error) return <Alert color="warning" fade={false}>{error}</Alert>;
  if (!sources.length) return null;
  const editable = onChange && hasPermission("credits.reserve");
  return <Alert color="info" fade={false}>
    <strong>Este proveedor tiene saldos a favor disponibles.</strong>
    <p className="mb-2">Revise el saldo antes de pagar. Los importes elegidos se reservarán al guardar y se aplicarán al confirmar el pago; la factura conserva su importe original.</p>
    {sources.map(source => <div key={source.id} className="border-top pt-2 mt-2">
      <div>{source.document} · Expediente #{source.id} · Disponible: <strong>{source.currency} {money(source.available)}</strong></div>
      {editable && <div className="mt-2"><Label htmlFor={`credit-amount-${source.id}`}>Importe a reservar</Label><Input id={`credit-amount-${source.id}`} type="number" min="0" max={source.available} step="0.01" disabled={disabled} value={value.find(row => row.source_id === source.id)?.amount || ""} placeholder="0.00" onChange={event => {
        const amount = event.target.value; const others = value.filter(row => row.source_id !== source.id);
        onChange(Number(amount) > 0 ? [...others, { source_id: source.id, amount, reason: "Aplicación de saldo a favor a nueva orden / factura" }] : others);
      }} /></div>}
    </div>)}
    {value.length > 0 && <p className="fw-semibold mt-3 mb-0">Total seleccionado: {currency} {money(value.reduce((sum, row) => sum + Number(row.amount), 0))}</p>}
    {!editable && <p className="small mt-2 mb-0">La reserva requiere el permiso “Reservar saldos a favor”. Puede gestionarla una persona autorizada antes del pago.</p>}
  </Alert>;
}
