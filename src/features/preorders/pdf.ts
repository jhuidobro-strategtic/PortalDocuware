import moment from "moment";
import { api } from "./services";
import type { PreOrder } from "./types";
import type { PreOrderOptions } from "./PreOrderForm";
import type { Document, DocumentDetail } from "../documents/types/list.types";
import { generatePurchaseOrderPdf } from "../purchase-orders/services/purchaseOrderPdf";
import { fetchPurchaseOrderApprovals } from "../purchase-orders/services/purchaseOrderApprovals";
import { fetchPurchaseOrderInvoiceDetails } from "../purchase-orders/services/purchaseOrderInvoiceDetails";

const preOrderCostDetails = (row: PreOrder, options: PreOrderOptions): DocumentDetail[] => row.order_data.details.map((line, index) => ({
  detailid: index + 1, description: line.descriptionItem, quantity: Number(line.quantity), unit_value: line.unitPrice,
  centro_costo_1: options.costs1?.find((cost) => cost.centroid === line.centro_costo_1_id) || null,
  centro_costo_2: options.costs2?.find((cost) => cost.centroid === line.centro_costo_2_id) || null,
} as DocumentDetail));

export const makePreOrderPdf = async (row: PreOrder, options: PreOrderOptions) => {
  const signed = !!row.approved_at;
  return generatePurchaseOrderPdf({
    invoiceDetails: preOrderCostDetails(row, options),
    documentTitle: row.order_type === "S" ? "PRE-ORDEN DE SERVICIO" : "PRE-ORDEN DE COMPRA",
    amountSummary: row.order_data.total && row.order_data.subtotal ? {
      subtotal: row.order_data.subtotal, tax: row.order_data.tax_amount || "0", total: row.order_data.total,
    } : undefined,
    purchaseOrder: { purchaseOrderID: row.id, orderNo: row.tracking_number || `PRE-PENDIENTE-${row.id}`, supplierID: row.supplier_id,
      documentAssociatedType: 0, documentAssociatedNo: row.source_reference || row.title, ...row.order_data,
      purchaseState: 0, tipoorden: row.order_type, signature: row.junior_id, signature2: row.senior_id, createdBy: row.creator_id,
      createAt: row.created_at, hasSeniorApproval: signed, approvalStatus: signed ? "APPROVED" : row.junior_signed_at ? "JR_SIGNED" : "PENDING",
      details: row.order_data.details.map((line, index) => ({ purchaseDetailID: index + 1, ...line, quantity: Number(line.quantity),
        total: line.total || (Number(line.quantity) * Number(line.unitPrice)).toFixed(2) })) },
    supplier: { supplierid: row.supplier_id, supplierno: row.supplier_ruc, suppliername: row.supplier_name },
    documentAssociatedTypeLabel: row.source_kind, requiredByName: row.order_data.requiredby, solicitanteName: row.creator_name,
    juniorSignerName: row.junior_name, seniorSignerName: row.senior_name, executedByName: row.creator_name,
    approvals: [...(row.junior_signed_at && row.junior_id ? [{ approvalID: -row.id, purchaseOrderID: row.id, approvalLevel: "JR" as const, signedAt: row.junior_signed_at, user: { userID: row.junior_id, fullName: row.junior_name || "" } }] : []), ...(signed ? [{ approvalID: row.id, purchaseOrderID: row.id, approvalLevel: "SENIOR" as const, signedAt: row.approved_at!,
      user: { userID: row.senior_id, fullName: row.senior_name } }] : [])],
    currencyLabel: options.currency.find((option) => Number(option.value) === row.order_data.currency)?.label,
    paymentConditionLabel: options.payment.find((option) => Number(option.value) === row.order_data.paymentCondition)?.label,
    storeLabel: options.stores.find((option) => Number(option.value) === row.order_data.store)?.label,
    userLookup: { [row.creator_id]: row.creator_name, [row.senior_id]: row.senior_name }, numberLocale: "es-PE", isAuditApproved: signed,
  });
};

export const makeConvertedOrderPdf = async (row: PreOrder, options: PreOrderOptions, actor: number, save = true) => {
  if (!row.converted_order_id || !row.invoice_id) throw new Error("La OC/OS todavía no ha sido generada.");
  const [order, invoice, approvals] = await Promise.all([
    api<any>(`purchase-orders/${row.converted_order_id}/`), api<Document>(`documents/${row.invoice_id}/`),
    fetchPurchaseOrderApprovals(row.converted_order_id),
  ]);
  const details = await fetchPurchaseOrderInvoiceDetails(invoice);
  const pdf = await generatePurchaseOrderPdf({
    purchaseOrder: { ...order, supplierID: row.supplier_id, documentAssociatedType: invoice.documenttype && typeof invoice.documenttype === "object" ? invoice.documenttype.tipoid : invoice.documenttype,
      paymentCondition: row.order_data.paymentCondition, currency: row.order_data.currency, store: row.order_data.store,
      purchaseState: typeof order.purchaseState === "object" ? order.purchaseState?.id : order.purchaseState },
    relatedDocument: invoice, invoiceDetails: row.order_data.details.some((line) => line.centro_costo_1_id || line.centro_costo_2_id) ? preOrderCostDetails(row, options) : details, approvals,
    supplier: { supplierid: row.supplier_id, supplierno: row.supplier_ruc, suppliername: row.supplier_name },
    currencyLabel: options.currency.find((option) => Number(option.value) === row.order_data.currency)?.label,
    paymentConditionLabel: options.payment.find((option) => Number(option.value) === row.order_data.paymentCondition)?.label,
    storeLabel: options.stores.find((option) => Number(option.value) === row.order_data.store)?.label,
    solicitanteName: row.order_data.requiredby, seniorSignerName: row.senior_name, executedByName: row.creator_name,
    userLookup: { [row.creator_id]: row.creator_name, [row.senior_id]: row.senior_name }, numberLocale: "es-PE", isAuditApproved: true,
  });
  if (save && row.expedient_id) {
    const body = new FormData(); body.append("tipodocumentoid", "2"); body.append("createdby", String(actor));
    body.append("file", new File([pdf.blob], pdf.fileName, { type: "application/pdf" }));
    // Do not append another official PDF when the conversion is retried.
    const expediente = await api<any>(`expedientes/${row.expedient_id}/`);
    if (!(expediente.expediente_documentos || []).some((file: any) => Number(file.tipodocumentoid) === 2 && file.estado !== false)) {
      await api(`expedientes/${row.expedient_id}/documentos/`, { method: "POST", body });
    }
  }
  return pdf;
};
