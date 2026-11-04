import { buildApiUrl } from "../../helpers/api-url";
import { getApiErrorMessage } from "../../helpers/api-error-message";
import type { PreOrder, PreOrderDraft } from "./types";

export const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(path), init);
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false || !result) throw new Error(getApiErrorMessage(result, "No fue posible completar la solicitud."));
  return result.data ?? result;
};
export const getPreOrders = (userID: number) => api<PreOrder[]>(`pre-orders/?userID=${userID}`);
export const savePreOrder = (draft: PreOrderDraft, file: File | null, userID: number, id?: number) => {
  const body = new FormData(); body.append("data", JSON.stringify(draft)); body.append("userID", String(userID));
  if (file) body.append("file", file);
  return api<PreOrder>(id ? `pre-orders/${id}/edit/` : "pre-orders/", { method: "POST", body });
};
export const actOnPreOrder = (id: number, action: string, userID: number, values: Record<string, unknown> = {}) =>
  api<PreOrder>(`pre-orders/${id}/${action}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userID, ...values }) });
export const attachPreOrderFile = (id: number, userID: number, file: File) => {
  const body = new FormData(); body.append("userID", String(userID)); body.append("file", file);
  return api<PreOrder>(`pre-orders/${id}/files/`, { method: "POST", body });
};
export const uploadPreOrderInvoice = (id: number, userID: number, file: File) => {
  const body = new FormData(); body.append("userID", String(userID)); body.append("file", file);
  return api<PreOrder>(`pre-orders/${id}/invoice-upload/`, { method: "POST", body });
};
