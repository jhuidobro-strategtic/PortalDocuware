/** @jest-environment node */
import { applySavedItemCodes, mapSunatItemsToOrderDetails, buildPurchaseOrderPayload } from "./orderC.utils";
import type { OrderCFormValues } from "../types/orderC.types";

test("invoice codes retain leading zeros through order payload", () => {
  const details = mapSunatItemsToOrderDetails([{ codigo: "00015-AB", descripcion: "Repuesto", cantidad: "0.10", valor_unitario: "10" }]);
  const values = { createdBy: "1", supplierID: "1", documentAssociatedType: "1", documentAssociatedNo: "F001-12", paymentCondition: "1", currency: "1", guideNo: "", store: "1", purchaseState: "1", requiredby: "Compras", signedBy: "", signature2: "2", orderType: "C", orderNo: "" } as OrderCFormValues;
  expect(details[0].item_code).toBe("00015-AB");
  expect(buildPurchaseOrderPayload(values, details).details[0].item_code).toBe("00015-AB");
  expect(mapSunatItemsToOrderDetails([{ descripcion: "Sin código", cantidad: 1 }])[0].item_code).toBe("");
});

test("manually edited or cleared codes take priority over a new SUNAT query", () => {
  const lines = mapSunatItemsToOrderDetails([{ codigo: "ORIGINAL", descripcion: "Repuesto", cantidad: "0.1", valor_unitario: "10" }]);
  const saved = { description: "Repuesto", quantity: 0.1, unit_value: "10.00", item_code: "EDITADO" } as import("../types/list.types").DocumentDetail;
  expect(applySavedItemCodes(lines, [saved])[0].item_code).toBe("EDITADO");
  expect(applySavedItemCodes(lines, [{ ...saved, item_code: "" }])[0].item_code).toBe("");
  expect(applySavedItemCodes(lines, [saved, { ...saved, item_code: "OTRO" }])[0].item_code).toBe("ORIGINAL");
});
