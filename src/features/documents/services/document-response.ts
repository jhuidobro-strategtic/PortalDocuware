import type { Document } from "../types/list.types";

interface DocumentResponse {
  success?: boolean;
  message?: string;
  data?: Document[];
  pagination?: { count: number; page: number };
}

export async function readDocumentResponse(response: Pick<Response, "json" | "status">): Promise<DocumentResponse> {
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`No fue posible consultar los documentos (HTTP ${response.status}). El servidor devolvió una respuesta no válida. Intenta nuevamente.`);
  }
  return payload as DocumentResponse;
}
