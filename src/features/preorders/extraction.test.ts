/** @jest-environment node */
import { extractedDraft } from "./extraction";
import type { PreOrderOptions } from "./PreOrderForm";

const options: PreOrderOptions = { suppliers: [{ supplierID: 12, supplierNo: "20388203111", supplierName: "NCH PERU S.A." }], seniors: [], payment: [], stores: [],
  currency: [{ value: "1", label: "Soles" }, { value: "2", label: "Dólares Americanos" }] };

test("review draft keeps extracted net lines, currency and tax without assigning a Senior", () => {
  const draft = extractedDraft({ supplier_ruc: "20388203111", source_kind: "COTIZACION", source_reference: "PE0038417", currency: "USD", tax_amount: "90.60",
    source_date: "2026-09-07", details: [{ descriptionItem: "Premalube", quantity: "2", unitPrice: "251.68", total: "503.36" }] }, options, "Creador");
  expect(draft.supplier_id).toBe(12); expect(draft.senior_id).toBe(0); expect(draft.order_data.currency).toBe(2);
  expect(draft.order_data.tax_amount).toBe("90.60"); expect(draft.order_data.details[0].unitPrice).toBe("251.68");
  expect(draft.order_data.source_date).toBe("2026-09-07"); expect(draft.order_data.requiredby).toBe("Creador");
});
test("unknown supplier remains unselected and an unreadable letter can be completed manually", () => {
  const draft = extractedDraft({ source_kind: "CARTA", supplier_name: "Proveedor no encontrado" }, options, "Usuario");
  expect(draft.supplier_id).toBe(0); expect(draft.order_data.details[0].descriptionItem).toBe(""); expect(draft.order_data.currency).toBe(0);
});
test("ambiguous supplier and currency catalog entries are not selected automatically", () => {
  const ambiguous = { ...options, suppliers: [...options.suppliers, { ...options.suppliers[0], supplierID: 13 }], currency: [...options.currency, { value: "3", label: "USD" }] };
  const draft = extractedDraft({ supplier_ruc: "20388203111", currency: "USD" }, ambiguous, "");
  expect(draft.supplier_id).toBe(0); expect(draft.order_data.currency).toBe(0);
});
