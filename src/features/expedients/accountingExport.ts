import type { Document } from "../documents/types/list.types";

type Invoice = Pick<Document, "documenttype"> & Partial<Pick<Document, "sourceKind">>;

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
