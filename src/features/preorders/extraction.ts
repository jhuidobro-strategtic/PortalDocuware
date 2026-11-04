import type { PreOrderDraft, PreOrderLine } from "./types";
import type { PreOrderOptions } from "./PreOrderForm";

export interface PreOrderExtraction {
  title?: string; source_kind?: string; source_reference?: string; supplier_ruc?: string; supplier_name?: string;
  currency?: string; source_date?: string; payment_terms?: string; order_type?: string;
  subtotal?: string | null; tax_amount?: string | null; total?: string | null; details?: PreOrderLine[]; warnings?: string[];
}
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
export const extractedDraft = (result: PreOrderExtraction, options: PreOrderOptions, creatorName: string): PreOrderDraft => {
  const supplierMatches = result.supplier_ruc ? options.suppliers.filter((supplier) => supplier.supplierNo === result.supplier_ruc)
    : result.supplier_name ? options.suppliers.filter((supplier) => normalize(supplier.supplierName) === normalize(result.supplier_name!)) : [];
  const currencyCode = result.currency?.toUpperCase();
  const currencies = currencyCode ? options.currency.filter((option) => currencyCode === "USD" ? /USD|D[OÓ]LAR/i.test(option.label)
    : currencyCode === "PEN" ? /PEN|SOL/i.test(option.label) : normalize(option.label) === currencyCode) : [];
  return { title: result.title || "", source_kind: result.source_kind || "OTRO", source_reference: result.source_reference || "",
    supplier_id: supplierMatches.length === 1 ? supplierMatches[0].supplierID : 0, senior_id: 0, order_type: result.order_type === "S" ? "S" : "C",
    order_data: { paymentCondition: 0, currency: currencies.length === 1 ? Number(currencies[0].value) : 0, store: 0,
      guideNo: "", requiredby: creatorName, details: result.details?.length ? result.details : [{ descriptionItem: "", quantity: "1", unitPrice: "" }],
      source_date: result.source_date || "", payment_terms: result.payment_terms || "", tax_amount: result.tax_amount ?? "0.00" } };
};
