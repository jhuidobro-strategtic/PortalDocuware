import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import TableActionsMenu from '../../../components/common/TableActionsMenu';
import { hasPermission } from '../../../helpers/portal-access';
import { PreOrder, stateLabels } from '../../preorders/types';
import type { ReviewAction } from './PreOrderSignatureInbox';

interface Props {
  row: PreOrder; userId: number | null; approvalRole: string;
  payment: Record<number, string>; currency: Record<number, string>; store: Record<number, string>;
  busy: boolean; onOpen: (row: PreOrder, action: ReviewAction) => void;
}
export default function PreOrderTableRow({ row, userId, approvalRole, payment, currency, store, busy, onOpen }: Props) {
  const navigate = useNavigate();
  const junior = row.junior_id === userId && ['JR', 'JUNIOR'].includes(approvalRole);
  const senior = row.senior_id === userId && approvalRole === 'SENIOR';
  const canSign = hasPermission('preorders.sign') && ((junior && row.status === 'PENDING') || (senior && ['PENDING', 'JR_SIGNED'].includes(row.status)));
  const data = row.order_data;
  const total = data.total ? Number(data.total) : data.details.reduce((sum, line) => sum + Number(line.total ?? Number(line.quantity) * Number(line.unitPrice)), 0) + Number(data.tax_amount || 0);
  return <tr data-record-type="preorder">
    <td className="text-center"><TableActionsMenu disabled={busy} items={[
      { id: `pre-view-${row.id}`, label: 'Ver preorden y documentos', icon: 'ri-folder-open-line', onClick: () => onOpen(row, 'view') },
      ...(canSign ? [{ id: `pre-sign-${row.id}`, label: `Firmar como ${junior ? 'Junior' : 'Senior'}`, icon: 'ri-quill-pen-line', onClick: () => onOpen(row, 'approve') }] : []),
      ...(senior && hasPermission('preorders.reject') && ['PENDING', 'JR_SIGNED'].includes(row.status) ? [{ id: `pre-reject-${row.id}`, label: 'Rechazar preorden', icon: 'ri-close-circle-line', tone: 'danger' as const, onClick: () => onOpen(row, 'reject') }] : []),
      ...(row.status === 'WAITING_INVOICE' && hasPermission('preorders.read') ? [{ id: `pre-link-${row.id}`, label: 'Vincular comprobante', icon: 'ri-file-add-line', onClick: () => navigate('/pre-orders') }] : []),
    ]} /></td>
    <td>#{row.id}</td><td><span className="badge bg-info-subtle text-info mb-1">Pre-Orden · {row.order_type === 'S' ? 'OS' : 'OC'}</span><div>{row.tracking_number || `PRE-PENDIENTE-${row.id}`}</div><small className="text-muted d-block purchase-order-table__subject">{row.title}</small></td>
    <td>{row.supplier_name}<small className="d-block text-muted">{row.supplier_ruc}</small></td><td>{row.source_reference || '—'}</td>
    <td>{payment[data.paymentCondition] || '—'}</td><td>{currency[data.currency] || data.extraction?.currency || '—'}</td><td>{data.guideNo || '—'}</td><td>{store[data.store] || '—'}</td>
    <td><span className={`badge ${row.status === 'WAITING_INVOICE' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>{stateLabels[row.status]}</span>
      {row.junior_id && <div className={`small mt-1 ${row.junior_signed_at ? 'text-success' : 'text-muted'}`} style={{ whiteSpace: 'normal', minWidth: 200 }}>Junior: {row.junior_name} · {row.junior_signed_at ? 'Firmado' : 'Pendiente'}</div>}
      <div className={`small mt-1 ${row.approved_at ? 'text-success' : 'text-muted'}`} style={{ whiteSpace: 'normal', minWidth: 200 }}>Senior: {row.senior_name} · {row.approved_at ? 'Firmado' : 'Pendiente'}</div>
    </td><td>{row.creator_name}</td><td>{moment(row.created_at).format('DD/MM/YYYY')}</td><td className="text-center">{data.details.length}</td><td className="text-end fw-semibold">{total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
  </tr>;
}
