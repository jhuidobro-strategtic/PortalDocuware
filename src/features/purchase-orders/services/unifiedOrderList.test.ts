import { filterPreOrderRows, mergeOrderRows } from './unifiedOrderList';
import type { PreOrder } from '../../preorders/types';

const rows = [
  { id: 1, title: 'Cotización para almacén', status: 'PENDING', junior_id: 10, senior_id: 20, created_at: '2026-11-23T10:00:00Z', converted_order_id: null },
  { id: 2, title: 'Servicio mensual', status: 'JR_SIGNED', junior_id: 11, senior_id: 20, created_at: '2026-11-23T12:00:00Z', converted_order_id: null },
  { id: 3, title: 'Compra firmada', status: 'WAITING_INVOICE', senior_id: 21, created_at: '2026-11-23T09:00:00Z', converted_order_id: null },
] as PreOrder[];
const defaults = { type: 'all', state: 'all', signer: 'all', search: '' };

test('Todos includes active preorders and Pre-Órdenes selects only preorders', () => {
  expect(filterPreOrderRows(rows, defaults)).toHaveLength(3);
  expect(filterPreOrderRows(rows, { ...defaults, type: 'PRE' })).toHaveLength(3);
  expect(filterPreOrderRows(rows, { ...defaults, type: 'C' })).toEqual([]);
  expect(filterPreOrderRows(rows, { ...defaults, type: 'S' })).toEqual([]);
});
test('combines search, pre-order state and either assigned signer', () => {
  expect(filterPreOrderRows(rows, { ...defaults, state: 'pre:JR_SIGNED', signer: '20', search: 'servicio' })).toEqual([rows[1]]);
  expect(filterPreOrderRows(rows, { ...defaults, signer: '10', search: 'cotizacion almacen' })).toEqual([rows[0]]);
  expect(filterPreOrderRows(rows, { ...defaults, state: '1' })).toEqual([]);
});
test('finds the displayed reference of pending preorders without a tracking number', () => {
  expect(filterPreOrderRows(rows, { ...defaults, search: 'PRE-PENDIENTE-1' })).toEqual([rows[0]]);
});
test('excludes converted preorders to avoid duplicate definitive orders', () => {
  expect(filterPreOrderRows([{ ...rows[0], converted_order_id: 99 }, { ...rows[1], status: 'CONVERTED' }], defaults)).toEqual([]);
});
test('uses one chronological list with distinct identities and one page limit', () => {
  const merged = mergeOrderRows([{ purchaseOrderID: 1, createAt: '2026-11-23T11:00:00Z' }], rows);
  expect(merged.map((row) => row.key)).toEqual(['preorder:2', 'order:1', 'preorder:1', 'preorder:3']);
  expect(merged.slice(0, 2).map((row) => row.kind)).toEqual(['preorder', 'order']);
  expect(new Set(merged.map((row) => row.key)).size).toBe(4);
});
