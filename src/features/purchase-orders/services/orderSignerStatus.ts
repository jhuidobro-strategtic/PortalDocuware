import type { PurchaseOrderApproval } from "./purchaseOrderApprovals";

interface OrderSignatures {
  purchaseOrderID: number; signature: number | null; signature2: number | null;
  approvalStatus: string; hasSeniorApproval: boolean; approvals?: PurchaseOrderApproval[];
}
export const getOrderSignerStatus = (order: OrderSignatures, names: Record<number, string>, terminal = false) => {
  const approvals = (order.approvals || []).filter((approval) => approval.purchaseOrderID === order.purchaseOrderID);
  return (["JR", "SENIOR"] as const).flatMap((level) => {
    const approval = approvals.find((item) => item.approvalLevel === level);
    const assigned = level === "JR" ? order.signature : order.signature2;
    const signed = !!approval || (level === "JR" ? order.approvalStatus === "JR_SIGNED" : order.hasSeniorApproval);
    if ((!assigned && !approval) || (!signed && (terminal || order.hasSeniorApproval))) return [];
    const id = approval?.user?.userID || assigned;
    const name = approval?.user?.fullName || approval?.user?.userName || (id ? names[id] || `Usuario #${id}` : "Sin identificar");
    return [{ level, signed, name, label: `${signed ? "Firmó" : "Pendiente"} ${level === "JR" ? "Junior" : "Senior"}: ${name}` }];
  });
};
