/** @jest-environment node */
import type { DocumentDetail } from "../../documents/types/list.types";
import { resolvePurchaseOrderCostCenters } from "./purchaseOrderCostCenters";

const invoice = (quantity: number, first: string | null, second = "930000000") => ({
  description: "GAS NATURAL LICUADO", quantity, unit_value: "2.57",
  centro_costo_1: first ? { centroid: 1, centrocodigo: first, descripcion: "Vehículo" } : null,
  centro_costo_2: { centroid: 2, centrocodigo: second, descripcion: "Transportes" },
} as DocumentDetail);
const line = (quantity: number) => ({ descriptionItem: "GAS NATURAL LICUADO", quantity, unitPrice: "2.57" });

test("bulk cost centers remain visible when historical invoice quantities were truncated", () => {
  const codes = resolvePurchaseOrderCostCenters([line(6.63), line(1.42)], [invoice(6, "02TN00027"), invoice(1, "02TN00027")]);
  expect(codes).toEqual(Array(2).fill({ costCenter1: "02TN00027", costCenter2: "930000000" }));
});
test("exact rows keep distinct cost centers even when reordered", () => {
  expect(resolvePurchaseOrderCostCenters([line(2), line(1)], [invoice(1, "FIRST"), invoice(2, "SECOND")]))
    .toEqual([{ costCenter1: "SECOND", costCenter2: "930000000" }, { costCenter1: "FIRST", costCenter2: "930000000" }]);
});
test("ambiguous rows never borrow a different vehicle's cost center", () => {
  expect(resolvePurchaseOrderCostCenters([line(1.42)], [invoice(1, "FIRST"), invoice(1, "SECOND")]))
    .toEqual([{ costCenter1: undefined, costCenter2: "930000000" }]);
});
test("a partially empty assignment is not treated as a shared code", () => {
  expect(resolvePurchaseOrderCostCenters([line(1.42)], [invoice(1, "FIRST"), invoice(2, null)])[0].costCenter1).toBeUndefined();
});
test("different descriptions do not share unrelated cost centers", () => {
  expect(resolvePurchaseOrderCostCenters([{ ...line(1), descriptionItem: "Otro servicio" }], [invoice(1, "FIRST")]))
    .toEqual([{ costCenter1: undefined, costCenter2: undefined }]);
});
