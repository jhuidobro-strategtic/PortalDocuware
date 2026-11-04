/** @jest-environment node */
import { makePreOrderPdf } from "./pdf";
import { generatePurchaseOrderPdf } from "../purchase-orders/services/purchaseOrderPdf";
import type { PreOrder } from "./types";

jest.mock("../purchase-orders/services/purchaseOrderPdf", () => ({ generatePurchaseOrderPdf: jest.fn(async (params) => params) }));
jest.mock("./services", () => ({ api: jest.fn() }));
jest.mock("../purchase-orders/services/purchaseOrderApprovals", () => ({ fetchPurchaseOrderApprovals: jest.fn() }));
jest.mock("../purchase-orders/services/purchaseOrderInvoiceDetails", () => ({ fetchPurchaseOrderInvoiceDetails: jest.fn() }));

test("preorder preview includes Junior audit and cost codes before Senior signs", async () => {
  const row = { id: 12, order_type: "C", source_reference: "COT-1", title: "Cotización", supplier_id: 5,
    creator_id: 1, creator_name: "Creador", junior_id: 2, junior_name: "Junior", senior_id: 3, senior_name: "Senior",
    junior_signed_at: "2026-11-04T19:00:00Z", approved_at: null, created_at: "2026-11-04T18:00:00Z",
    order_data: { paymentCondition: 1, currency: 2, store: 3, requiredby: "Creador", guideNo: "", details: [
      { descriptionItem: "Servicio", quantity: "0.1", unitPrice: "100.00", centro_costo_1_id: 87, centro_costo_2_id: 2 },
    ] } } as PreOrder;
  await makePreOrderPdf(row, { suppliers: [], seniors: [], currency: [], payment: [], stores: [],
    costs1: [{ centroid: 87, centrocodigo: "CC-87", descripcion: "Costo 1" }], costs2: [{ centroid: 2, centrocodigo: "CC-2", descripcion: "Costo 2" }] });
  const params = (generatePurchaseOrderPdf as jest.Mock).mock.calls[0][0];
  expect(params.purchaseOrder.approvalStatus).toBe("JR_SIGNED");
  expect(params.purchaseOrder.hasSeniorApproval).toBe(false);
  expect(params.approvals).toEqual([expect.objectContaining({ approvalLevel: "JR", signedAt: row.junior_signed_at })]);
  expect(params.juniorSignerName).toBe("Junior");
  expect(params.invoiceDetails[0].centro_costo_1.centrocodigo).toBe("CC-87");
  expect(params.invoiceDetails[0].centro_costo_2.centrocodigo).toBe("CC-2");
});
