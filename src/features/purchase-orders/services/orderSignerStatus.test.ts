/** @jest-environment node */
import { getOrderSignerStatus } from "./orderSignerStatus";
const order = { purchaseOrderID: 1, signature: 2, signature2: 3, approvalStatus: "PENDING", hasSeniorApproval: false };
const names = { 2: "Junior asignado", 3: "Senior asignado" };
test("pending orders show who must sign at each level", () => {
  expect(getOrderSignerStatus(order, names).map((signer) => signer.label)).toEqual(["Pendiente Junior: Junior asignado", "Pendiente Senior: Senior asignado"]);
});
test("Junior signed keeps Senior pending and prefers the recorded signer", () => {
  const result = getOrderSignerStatus({ ...order, approvalStatus: "JR_SIGNED", approvals: [{ approvalID: 1, purchaseOrderID: 1, approvalLevel: "JR", signedAt: "2026-11-06", user: { userID: 9, fullName: "Junior que firmó" } }] }, names);
  expect(result[0]).toMatchObject({ signed: true, name: "Junior que firmó" });
  expect(result[1].signed).toBe(false);
});
test("Senior approval without Junior signature does not claim Junior signed", () => {
  expect(getOrderSignerStatus({ ...order, approvalStatus: "APPROVED", hasSeniorApproval: true }, names).map((signer) => signer.label)).toEqual(["Firmó Senior: Senior asignado"]);
  expect(getOrderSignerStatus(order, names, true)).toEqual([]);
});
