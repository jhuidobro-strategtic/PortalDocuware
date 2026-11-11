import type { Document } from "../documents/types/list.types";

type Invoice = Pick<Document, "documenttype"> & Partial<Pick<Document, "sourceKind" | "accounting_adjustment" | "withholdingamount" | "totalamount">>;

export function documentExportCode(invoice?: Invoice | null, noteKind?: string): string {
  const type = typeof invoice?.documenttype === "object" ? invoice?.documenttype?.tipo : "";
  const name = String(type || noteKind || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (name.includes("CREDITO") || name === "CREDIT" || name === "NC") return "07";
  if (name.includes("DEBITO") || name === "DEBIT" || name === "ND") return "08";
  if (invoice?.sourceKind === "RH" || name.includes("HONORARIO") || name === "RH") return "02";
  if (invoice?.sourceKind === "BOLETA" || name.includes("BOLETA")) return "03";
  if (name.includes("FACTURA")) return "01";
  return "00";
}

export const accountingExportHeaders = ["Tasa retención", "Tasa detracción", "Concepto del descuento", "Base del descuento",
  "Monto retención", "Monto detracción", "Retención indicada en RH", "Neto a pagar", "Aplicación del descuento"];

// In the detail sheet these are document-level values, repeated explicitly, not additive item values.
export function accountingExportValues(invoice?: Invoice | null): (number | string | null)[] {
  if (!invoice) return Array(accountingExportHeaders.length).fill(null);
  const adjustment = invoice.accounting_adjustment || {};
  const amount = Number(adjustment.amount || 0);
  const withholding = Number(invoice.withholdingamount || 0);
  const isRetention = adjustment.kind === "retention";
  const isDetraction = adjustment.kind === "detraction";
  return [isRetention ? Number(adjustment.rate || 0) / 100 : null,
    isDetraction ? Number(adjustment.rate || 0) / 100 : null, adjustment.concept || "",
    adjustment.option_id ? Number(adjustment.base || invoice.totalamount || 0) : null,
    isRetention ? amount : 0, isDetraction ? amount : 0, withholding,
    Math.round((Number(invoice.totalamount || 0) - withholding - amount) * 100) / 100,
    adjustment.option_id ? "Selección manual" : withholding > 0 ? "Indicada en el recibo" : "Sin descuento"];
}
