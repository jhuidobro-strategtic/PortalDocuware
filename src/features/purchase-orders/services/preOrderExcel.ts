import type { Worksheet } from 'exceljs';
import moment from 'moment';
import { PreOrder, stateLabels } from '../../preorders/types';

export interface PreOrderExportState { rows: PreOrder[]; loading: boolean; error: string; }
interface Lookups { payment: Record<number, string>; currency: Record<number, string>; store: Record<number, string>; }
export const orderExtraHeaders = ['Tipo de registro', 'Tipo OC/OS', 'RUC', 'Asunto', 'Firmante Junior', 'Fecha firma Junior', 'Firmante Senior', 'Fecha firma Senior'];
export const signatureDate = (value?: string | null) => value ? moment(value).format('DD/MM/YYYY HH:mm:ss') : '';

export function appendPreOrderExcelRows(summary: Worksheet, details: Worksheet, rows: PreOrder[], lookups: Lookups) {
  const seen = new Set<number>();
  const pending = rows.filter((row) => {
    if (seen.has(row.id) || row.converted_order_id || !['PENDING', 'JR_SIGNED', 'WAITING_INVOICE'].includes(row.status)) return false;
    seen.add(row.id);
    return true;
  });
  pending.forEach((preorder) => {
    const reference = preorder.tracking_number || `PRE-PENDIENTE-${preorder.id}`;
    const data = preorder.order_data;
    const subtotal = data.details.reduce((sum, line) => sum + Number(line.total ?? Number(line.quantity) * Number(line.unitPrice)), 0);
    const total = data.total ? Number(data.total) : subtotal + Number(data.tax_amount || 0);
    const currency = lookups.currency[data.currency] || data.extraction?.currency || '';
    const row = summary.addRow([
      preorder.id, reference, preorder.supplier_name, preorder.source_reference || '',
      lookups.payment[data.paymentCondition] || '', currency, data.guideNo || '', lookups.store[data.store] || '',
      stateLabels[preorder.status], preorder.senior_name, preorder.creator_name, moment(preorder.created_at).format('DD/MM/YYYY'),
      data.details.length, total, 'Preorden', preorder.order_type === 'S' ? 'OS' : 'OC', preorder.supplier_ruc,
      preorder.title, preorder.junior_name || '', signatureDate(preorder.junior_signed_at), preorder.senior_name,
      signatureDate(preorder.approved_at),
    ]);
    row.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    row.getCell(9).font = { bold: true, color: { argb: preorder.status === 'WAITING_INVOICE' ? '008000' : 'B54708' } };
    row.getCell(14).numFmt = '#,##0.00';
    data.details.forEach((line) => details.addRow([
      reference, preorder.source_reference || '', preorder.supplier_name, '', line.descriptionItem,
      Number(line.quantity), Number(line.unitPrice), Number(line.total ?? Number(line.quantity) * Number(line.unitPrice)),
      currency, 'Preorden', preorder.order_type === 'S' ? 'OS' : 'OC',
    ]));
  });
  return pending.length;
}
