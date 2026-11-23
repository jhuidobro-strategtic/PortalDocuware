import type { PreOrder } from '../../preorders/types';
import { stateLabels } from '../../preorders/types';
import { intelligentSearch } from '../../../helpers/search-utils';

export interface PreOrderFilters { type: string; state: string; signer: string; search: string; }
export function filterPreOrderRows(rows: PreOrder[], filters: PreOrderFilters) {
  if (!['all', 'PRE'].includes(filters.type)) return [];
  return rows.filter((row) => {
    if (row.converted_order_id || !['PENDING', 'JR_SIGNED', 'WAITING_INVOICE'].includes(row.status)) return false;
    if (filters.state !== 'all' && filters.state !== `pre:${row.status}`) return false;
    if (filters.signer !== 'all' && ![row.junior_id, row.senior_id].some((id) => String(id) === filters.signer)) return false;
    return intelligentSearch({ ...row, stateLabel: stateLabels[row.status], recordType: 'Pre-Órdenes Preorden' }, filters.search);
  });
}

export function mergeOrderRows<T extends { purchaseOrderID: number; createAt: string }>(orders: T[], preorders: PreOrder[]) {
  return [
    ...orders.map((order) => ({ kind: 'order' as const, key: `order:${order.purchaseOrderID}`, createdAt: order.createAt, order })),
    ...preorders.map((preorder) => ({ kind: 'preorder' as const, key: `preorder:${preorder.id}`, createdAt: preorder.created_at, preorder })),
  ].sort((left, right) => {
    const timestamp = (value: string) => { const result = Date.parse(value); return Number.isFinite(result) ? result : 0; };
    return timestamp(right.createdAt) - timestamp(left.createdAt) || right.key.localeCompare(left.key, undefined, { numeric: true });
  });
}
