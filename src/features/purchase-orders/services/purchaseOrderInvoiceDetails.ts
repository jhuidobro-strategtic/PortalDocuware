import { buildApiUrl } from "../../../helpers/api-url";
import type { Document, DocumentDetail } from "../../documents/types/list.types";

export const fetchPurchaseOrderInvoiceDetails = async (
  document: Document
): Promise<DocumentDetail[]> => {
  const query = new URLSearchParams({
    suppliernumber: document.suppliernumber,
    documentserial: document.documentserial,
    documentnumber: document.documentnumber,
  });
  const response = await fetch(buildApiUrl(`documents-detail/?${query}`));
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || "No fue posible obtener los centros de costo de la factura.");
  }
  const details = result?.data ?? result;
  if (Array.isArray(details)) return details;
  if (details && typeof details === "object" && "detailid" in details) return [details];
  throw new Error("La respuesta de detalles de factura no tiene un formato válido.");
};
