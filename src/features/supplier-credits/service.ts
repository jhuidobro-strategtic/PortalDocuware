import { buildApiUrl } from "../../helpers/api-url";
import { getApiErrorMessage } from "../../helpers/api-error-message";

export interface CreditSource {
  id: number; ruc: string; supplier: string; currency: string; document: string; order: string;
  generated: string; reserved: string; applied: string; refunded: string; available: string; balance: string; pending_adjustments: number;
  notes: { reference: string; amount: string; net_amount: string }[];
}
export interface CreditPick { source_id: number; amount: string; reason: string; }
export interface CreditApplication { id: number; source_id: number; order_id: number | null; order: string; target_id: number | null; amount: string; status: string; reason: string; created_by: string; created_at: string; events: CreditEvent[]; }
export interface CreditEvent { action: string; reason: string; actor: string; date: string; }
export interface CreditDetail extends CreditSource { applications: CreditApplication[]; refunds: { id: number; amount: string; reference: string; reason: string; active: boolean; actor: string; date: string; events: CreditEvent[] }[]; }
export const money = (value: string | number) => Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export async function creditRequest<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(buildApiUrl(path), body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal } : { signal });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(getApiErrorMessage(result, "No fue posible gestionar el saldo a favor."));
  return result.data;
}
