import type { DocumentDetail } from "../documents/types/list.types";
import { fetchPurchaseOrderInvoiceDetails } from "../purchase-orders/services/purchaseOrderInvoiceDetails";

interface InvoiceReference { documentid: number; suppliernumber: string; documentserial: string; documentnumber: string; }

export const fetchExpedientInvoiceDetails = async (invoices: InvoiceReference[]): Promise<Map<number, DocumentDetail[]>> => {
  const unique = [...new Map(invoices.map((invoice) => [invoice.documentid, invoice])).values()];
  const result = new Map<number, DocumentDetail[]>();
  // Bound parallel requests so large exports do not overload the API.
  for (let start = 0; start < unique.length; start += 4) {
    await Promise.all(unique.slice(start, start + 4).map(async (invoice) => {
      try {
        const details = await fetchPurchaseOrderInvoiceDetails(invoice);
        result.set(invoice.documentid, details.filter((detail) => !detail.document || Number(detail.document) === invoice.documentid));
      } catch {
        throw new Error(`No fue posible obtener los ítems de la factura ${invoice.documentserial}-${invoice.documentnumber}. Reintente la exportación.`);
      }
    }));
  }
  return result;
};
