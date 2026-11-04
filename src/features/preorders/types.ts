export interface PreOrderLine { descriptionItem: string; quantity: string; unitPrice: string; total?: string; centro_costo_1_id?: number | null; centro_costo_2_id?: number | null; }
export interface PreOrderDraft {
  title: string; source_kind: string; source_reference: string; supplier_id: number; senior_id: number; junior_id?: number | null; order_type: "C" | "S";
  order_data: { paymentCondition: number; currency: number; store: number; guideNo: string; requiredby: string; details: PreOrderLine[];
    tax_amount?: string; subtotal?: string; total?: string; source_date?: string; payment_terms?: string;
    extraction?: { warnings?: string[]; currency?: string; total?: string | null } };
}
export interface PreOrder extends PreOrderDraft {
  id: number; status: "DRAFT" | "PENDING" | "JR_SIGNED" | "REJECTED" | "WAITING_INVOICE" | "CONVERTED" | "CANCELLED";
  missing_fields?: string[];
  junior_name?: string; junior_signed_at?: string | null;
  creator_id: number; creator_name: string; senior_name: string; supplier_name: string; supplier_ruc: string;
  tracking_number: string | null; approved_at: string | null; created_at: string;
  invoice_job: { id: number; status: string; error: string | null } | null;
  invoice_id: number | null; converted_order_id: number | null; converted_order_number: string | null; expedient_id: number | null;
  files: { id: number; filename: string; url: string; created_at: string }[];
  events: { id: number; action: string; actor_name: string; notes: string; created_at: string }[];
}
export const stateLabels: Record<PreOrder['status'], string> = {
  DRAFT: "Borrador · por completar",
  PENDING: "Pendiente de firmas", JR_SIGNED: "Junior firmó · pendiente de Senior", REJECTED: "Rechazada", WAITING_INVOICE: "Firmada · pendiente de comprobante",
  CONVERTED: "OC/OS generada", CANCELLED: "Anulada",
};
