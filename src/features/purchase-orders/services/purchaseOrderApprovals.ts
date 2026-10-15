import { buildApiUrl } from "../../../helpers/api-url";

export interface PurchaseOrderApprovalUser {
  userID: number;
  userName?: string;
  fullName?: string;
  status?: boolean;
  approvalRole?: string;
  purchase_approval_role?: string;
}

export interface PurchaseOrderApproval {
  approvalID: number;
  purchaseOrderID: number;
  approvalLevel: "JR" | "SENIOR";
  signedAt: string;
  user?: PurchaseOrderApprovalUser;
  createdBy?: number;
  notes?: string;
  updatedAt?: string;
}

export const fetchPurchaseOrderApprovals = async (
  purchaseOrderID: number
): Promise<PurchaseOrderApproval[]> => {
  const response = await fetch(
    buildApiUrl(`purchase-order-approvals/?purchaseOrderID=${purchaseOrderID}`)
  );
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true || !Array.isArray(result.data)) {
    throw new Error(result?.message || "No fue posible obtener el historial de aprobaciones.");
  }

  return result.data;
};
