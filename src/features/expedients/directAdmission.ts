import { buildApiUrl } from "../../helpers/api-url";
import { getApiErrorMessage } from "../../helpers/api-error-message";
export interface DirectRequest {
  id: number; document_id: number; expediente_id: number | null; reason: string; status: string; creator: string; junior: string; senior: string;
  next_level: string; can_act: boolean; invoice_url: string | null; support_url: string | null; created_at: string;
  snapshot: { reference: string; ruc: string; supplier: string; currency: string; total: string };
  events: { action: string; actor: string; comment: string; date: string }[];
}
export const directStatuses: Record<string, string> = { CREATED: "Enviado a aprobación", PENDING: "Pendiente de firmas", JR_SIGNED: "Firmado Junior · pendiente Senior", APPROVED: "Aprobado · en Expedientes", REJECTED: "Rechazado" };
export async function directRequest<T>(path: string, body?: object | FormData, signal?: AbortSignal): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(buildApiUrl(path), body ? { method: "POST", headers: isForm ? undefined : { "Content-Type": "application/json" }, body: isForm ? body : JSON.stringify(body), signal } : { signal });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(getApiErrorMessage(result, "No fue posible gestionar el envío sin OC/OS."));
  return result.data;
}
