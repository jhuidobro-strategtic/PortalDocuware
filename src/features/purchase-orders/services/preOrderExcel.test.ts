/** @jest-environment node */
import { Workbook } from 'exceljs';
import type { PreOrder } from '../../preorders/types';
import { appendPreOrderExcelRows, orderExtraHeaders } from './preOrderExcel';

const pending = {
  id: 12, status: 'PENDING', title: 'Cotización de prueba', source_reference: 'COT-12',
  supplier_name: 'Proveedor de prueba', supplier_ruc: '00123456789', creator_name: 'Creador', junior_name: 'Junior', senior_name: 'Senior',
  order_type: 'S', created_at: '2026-11-23', tracking_number: null, junior_signed_at: null, approved_at: null, converted_order_id: null,
  order_data: { currency: 1, paymentCondition: 2, store: 3, guideNo: 'GUIA-1', tax_amount: '1.80',
    details: [{ descriptionItem: 'Servicio', quantity: '0.125', unitPrice: '80', total: '10.00' }] },
} as PreOrder;
const lookups = { currency: { 1: 'Soles' }, payment: { 2: 'Crédito' }, store: { 3: 'Principal' } };

test('includes preorders and item details alongside definitive orders in the saved workbook', async () => {
  const workbook = new Workbook();
  const summary = workbook.addWorksheet('Ordenes de Compra');
  const details = workbook.addWorksheet('Detalle de ítems');
  summary.getRow(3).values = [...Array.from({ length: 14 }, (_, index) => `Col ${index}`), ...orderExtraHeaders];
  summary.addRow([9, 'OC-0009', 'Proveedor existente']);
  details.addRow(['Orden', 'Documento', 'Proveedor', 'Código', 'Descripción', 'Cantidad', 'Precio', 'Total', 'Moneda', 'Tipo de registro', 'Tipo OC/OS']);
  details.addRow(['OC-0009', 'F001-1', 'Proveedor existente']);
  const junior = { ...pending, id: 13, status: 'JR_SIGNED', junior_signed_at: '2026-11-23T16:10:15Z' } as PreOrder;
  const signed = { ...junior, id: 14, status: 'WAITING_INVOICE', tracking_number: 'PRE-2026-0002', approved_at: '2026-11-23T16:10:19Z' } as PreOrder;
  expect(appendPreOrderExcelRows(summary, details, [pending, junior, signed], lookups)).toBe(3);
  const reopened = new Workbook();
  await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = reopened.getWorksheet('Ordenes de Compra')!;
  const lines = reopened.getWorksheet('Detalle de ítems')!;
  expect(sheet.getCell('B4').value).toBe('OC-0009');
  expect(sheet.rowCount).toBe(7);
  expect(['B5', 'D5', 'E5', 'F5', 'H5', 'I5', 'N5', 'O5', 'P5', 'Q5'].map((cell) => sheet.getCell(cell).value))
    .toEqual(['PRE-PENDIENTE-12', 'COT-12', 'Crédito', 'Soles', 'Principal', 'Pendiente de firmas', 11.8, 'Preorden', 'OS', '00123456789']);
  expect(sheet.getCell('T5').value).toBe('');
  expect(sheet.getCell('V5').value).toBe('');
  expect(sheet.getCell('T6').value).toBeTruthy();
  expect(sheet.getCell('V6').value).toBe('');
  expect(sheet.getCell('B7').value).toBe('PRE-2026-0002');
  expect(sheet.getCell('I7').value).toBe('Firmada · pendiente de comprobante');
  expect(sheet.getCell('V7').value).toBeTruthy();
  expect(lines.rowCount).toBe(5);
  expect(['A3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3', 'J3', 'K3'].map((cell) => lines.getCell(cell).value))
    .toEqual(['PRE-PENDIENTE-12', '', 'Servicio', 0.125, 80, 10, 'Soles', 'Preorden', 'OS']);
});

test('does not duplicate converted, rejected, draft or repeated preorders', () => {
  const workbook = new Workbook();
  const summary = workbook.addWorksheet('Resumen');
  const details = workbook.addWorksheet('Detalle');
  const excluded = ['CONVERTED', 'REJECTED', 'DRAFT', 'CANCELLED'].map((status, index) => ({ ...pending, id: 20 + index, status } as PreOrder));
  expect(appendPreOrderExcelRows(summary, details, [pending, pending, ...excluded, { ...pending, id: 50, converted_order_id: 1 }], lookups)).toBe(1);
  expect(summary.rowCount).toBe(1);
  expect(details.rowCount).toBe(1);
});
