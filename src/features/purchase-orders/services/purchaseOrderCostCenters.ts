import type { DocumentDetail } from "../../documents/types/list.types";

interface OrderLine { descriptionItem: string; quantity: number; unitPrice: string; }
interface CostCodes { costCenter1?: string; costCenter2?: string; }
const descriptionKey = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");

export const resolvePurchaseOrderCostCenters = (lines: OrderLine[], invoiceDetails: DocumentDetail[]): CostCodes[] => {
  const remaining = new Set(invoiceDetails.map((_, index) => index));
  // Reserve exact matches before considering older lines with truncated quantities.
  const matches = lines.map((line) => {
    const index = [...remaining].find((candidate) => {
      const invoice = invoiceDetails[candidate];
      return descriptionKey(invoice.description) === descriptionKey(line.descriptionItem) &&
        Number(invoice.quantity) === Number(line.quantity) &&
        Number(invoice.unit_value).toFixed(2) === Number(line.unitPrice).toFixed(2);
    });
    if (index !== undefined) remaining.delete(index);
    return index === undefined ? undefined : invoiceDetails[index];
  });
  return lines.map((line, index) => {
    const exact = matches[index];
    if (exact) return { costCenter1: exact.centro_costo_1?.centrocodigo, costCenter2: exact.centro_costo_2?.centrocodigo };
    const descriptionMatches = invoiceDetails.filter((invoice) => descriptionKey(invoice.description) === descriptionKey(line.descriptionItem));
    const priceMatches = descriptionMatches.filter((invoice) => Number(invoice.unit_value).toFixed(2) === Number(line.unitPrice).toFixed(2));
    const candidates = priceMatches.length ? priceMatches : descriptionMatches;
    const sharedCode = (field: "centro_costo_1" | "centro_costo_2") => {
      const codes = new Set(candidates.map((invoice) => invoice[field]?.centrocodigo?.trim() || ""));
      return codes.size === 1 ? [...codes][0] || undefined : undefined;
    };
    // A bulk assignment is safe to recover only when every candidate shares that code.
    return { costCenter1: sharedCode("centro_costo_1"), costCenter2: sharedCode("centro_costo_2") };
  });
};
