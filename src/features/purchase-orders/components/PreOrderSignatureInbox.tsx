import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardBody, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Table } from 'reactstrap';
import AppPagination from '../../../components/common/Pagination';
import { hasPermission } from '../../../helpers/portal-access';
import { intelligentSearch } from '../../../helpers/search-utils';
import { actOnPreOrder, getPreOrderSignatureInbox } from '../../preorders/services';
import { PreOrder, stateLabels } from '../../preorders/types';

interface Props { userId: number | null; approvalRole: string | null; currencyLookup: Record<number, string>; }
type ReviewAction = 'view' | 'approve' | 'reject';
const number = (value: unknown) => Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PreOrderSignatureInbox({ userId, approvalRole, currencyLookup }: Props) {
  const [rows, setRows] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PreOrder | null>(null);
  const [action, setAction] = useState<ReviewAction>('view');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const request = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    try {
      const result = await getPreOrderSignatureInbox(userId, controller.signal);
      if (!controller.signal.aborted) setRows(result);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No fue posible cargar las preórdenes.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { if (!submitting.current) void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { request.current?.abort(); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  const canSign = (row: PreOrder) => hasPermission('preorders.sign') && (
    (row.junior_id === userId && approvalRole === 'JR' && row.status === 'PENDING') ||
    (row.senior_id === userId && approvalRole === 'SENIOR' && ['PENDING', 'JR_SIGNED'].includes(row.status))
  );
  const canReject = (row: PreOrder) => hasPermission('preorders.reject') && row.senior_id === userId && approvalRole === 'SENIOR' && ['PENDING', 'JR_SIGNED'].includes(row.status);
  const filtered = useMemo(() => rows.filter((row) => intelligentSearch({
    id: row.id, title: row.title, reference: row.source_reference, supplier: row.supplier_name,
    ruc: row.supplier_ruc, creator: row.creator_name, junior: row.junior_name, senior: row.senior_name,
    tracking: row.tracking_number, status: stateLabels[row.status],
  }, search)), [rows, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const open = (row: PreOrder, next: ReviewAction) => {
    setSelected(row); setAction(next); setNotes(''); setActionError('');
  };
  const confirm = async () => {
    if (!selected || !userId || submitting.current || action === 'view') return;
    if ((action === 'approve' && !canSign(selected)) || (action === 'reject' && !canReject(selected))) return;
    submitting.current = true; setBusy(true); setActionError(''); setSuccess('');
    request.current?.abort();
    try {
      const updated = await actOnPreOrder(selected.id, action, userId, { notes });
      setRows((previous) => updated.status === 'REJECTED' ? previous.filter((row) => row.id !== updated.id) : previous.map((row) => row.id === updated.id ? updated : row));
      setSuccess(action === 'reject' ? 'Preorden rechazada. Se conserva su historial en Preórdenes.' : updated.status === 'JR_SIGNED' ? 'Firma Junior registrada. Pendiente de firma Senior.' : 'Firma Senior registrada. La preorden queda pendiente de comprobante.');
      setSelected(null);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'No fue posible registrar la firma.');
    } finally { submitting.current = false; setBusy(false); }
  };
  return <>
    <Card className="border-0 shadow-sm mb-4" aria-label="Preórdenes enviadas a firma">
      <CardBody>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
          <div><h5 className="mb-1">Preórdenes enviadas a firma</h5><p className="text-muted mb-0">Revise los sustentos y registre las firmas antes de vincular el comprobante.</p></div>
          <div className="d-flex flex-wrap gap-2">
            <Input aria-label="Buscar preórdenes para firma" placeholder="Buscar preorden o proveedor" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            <Button color="light" onClick={() => void refresh()} disabled={busy}>Actualizar preórdenes</Button>
          </div>
        </div>
        {success && <Alert color="success">{success}</Alert>}
        {error && <Alert color="danger">{error}</Alert>}
        {loading ? <div className="text-center py-3" role="status"><Spinner size="sm" /> Cargando preórdenes…</div> : <>
          <div className="table-responsive"><Table className="align-middle mb-0">
            <thead className="table-light"><tr><th>Preorden</th><th>Proveedor</th><th>Tipo</th><th>Creador / firmantes</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>{!filtered.length && <tr><td colSpan={6} className="text-center text-muted py-4">No hay preórdenes enviadas a firma para mostrar.</td></tr>}
              {filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row) => <tr key={row.id}>
                <td><strong>{row.tracking_number || `Preorden #${row.id}`}</strong><div>{row.title}</div><small className="text-muted">{row.source_reference}</small></td>
                <td>{row.supplier_name}<small className="d-block text-muted">{row.supplier_ruc}</small></td>
                <td>{row.order_type === 'C' ? 'OC' : 'OS'}</td>
                <td><div>{row.creator_name}</div><small className="d-block text-muted">Junior: {row.junior_name || 'No asignado'}{row.junior_signed_at ? ' · firmado' : ''}</small><small className="d-block text-muted">Senior: {row.senior_name}{row.approved_at ? ' · firmado' : ''}</small></td>
                <td><span className={`badge ${row.status === 'WAITING_INVOICE' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>{stateLabels[row.status]}</span></td>
                <td><div className="d-flex gap-2 flex-wrap">
                  <Button size="sm" color="light" onClick={() => open(row, 'view')} disabled={busy}>Ver preorden #{row.id}</Button>
                  {canSign(row) && <Button size="sm" color="primary" onClick={() => open(row, 'approve')} disabled={busy}>Firmar como {row.junior_id === userId && approvalRole === 'JR' ? 'Junior' : 'Senior'}</Button>}
                  {canReject(row) && <Button size="sm" color="danger" outline onClick={() => open(row, 'reject')} disabled={busy}>Rechazar preorden #{row.id}</Button>}
                  {row.status === 'WAITING_INVOICE' && hasPermission('preorders.read') && <Link className="btn btn-sm btn-light" to="/pre-orders">Ir a vincular comprobante</Link>}
                </div></td>
              </tr>)}
            </tbody>
          </Table></div>
          {pages > 1 && <AppPagination currentPage={currentPage} totalPages={pages} totalItems={filtered.length} itemsPerPage={10} onPageChange={setPage} />}
        </>}
      </CardBody>
    </Card>
    <Modal isOpen={!!selected} toggle={busy ? undefined : () => setSelected(null)} size="lg">
      <ModalHeader toggle={busy ? undefined : () => setSelected(null)}>{action === 'approve' ? 'Firmar preorden' : action === 'reject' ? 'Rechazar preorden' : 'Revisar preorden'}</ModalHeader>
      <ModalBody>{selected && <>
        {actionError && <Alert color="danger">{actionError}</Alert>}
        <h5>{selected.title}</h5><p>{selected.supplier_name} · {selected.supplier_ruc}</p>
        <p className="text-muted">{selected.source_kind} {selected.source_reference} · {stateLabels[selected.status]}</p>
        <p>Moneda: {currencyLookup[selected.order_data.currency] || selected.order_data.extraction?.currency || 'Pendiente de cargar'} · Solicitado por: {selected.order_data.requiredby || selected.creator_name}</p>
        <p>Creador: {selected.creator_name}<br />Junior: {selected.junior_name || 'No asignado'}{selected.junior_signed_at ? ' · firmado' : ''}<br />Senior: {selected.senior_name}{selected.approved_at ? ' · firmado' : ''}</p>
        <div className="table-responsive"><Table size="sm"><thead><tr><th>Detalle</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr></thead><tbody>
          {selected.order_data.details.map((line, index) => <tr key={index}><td>{line.descriptionItem}</td><td>{line.quantity}</td><td>{number(line.unitPrice)}</td><td>{number(line.total ?? Number(line.quantity) * Number(line.unitPrice))}</td></tr>)}
        </tbody></Table></div>
        <p>Subtotal: {number(selected.order_data.subtotal ?? selected.order_data.details.reduce((sum, line) => sum + Number(line.total ?? Number(line.quantity) * Number(line.unitPrice)), 0))} · Impuesto: {number(selected.order_data.tax_amount)}{selected.order_data.total && <> · Total: <strong>{number(selected.order_data.total)}</strong></>}</p>
        <h6>Documentos de sustento</h6>
        {selected.files.length ? <ul>{selected.files.map((file) => <li key={file.id}><a href={file.url} target="_blank" rel="noopener noreferrer">{file.filename}</a></li>)}</ul> : <p className="text-muted">Sin documentos adjuntos.</p>}
        {selected.events.length > 0 && <details className="mb-3"><summary>Historial de la preorden</summary><ul>{selected.events.map((event) => <li key={event.id}>{event.actor_name} · {event.action}{event.notes ? ` · ${event.notes}` : ''}</li>)}</ul></details>}
        {action !== 'view' && <><Label htmlFor="preorder-signature-notes">{action === 'reject' ? 'Motivo del rechazo *' : 'Observaciones de firma'}</Label><Input id="preorder-signature-notes" type="textarea" value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} />
          {action === 'approve' && <p className="text-muted mt-2 mb-0">Se registrará su firma en esta preorden. La OC/OS definitiva se generará al vincular el comprobante.</p>}</>}
      </>}</ModalBody>
      <ModalFooter><Button color="light" disabled={busy} onClick={() => setSelected(null)}>Cerrar</Button>
        {action !== 'view' && <Button color={action === 'reject' ? 'danger' : 'primary'} disabled={busy || (action === 'reject' && !notes.trim())} onClick={() => void confirm()}>{busy && <Spinner size="sm" className="me-2" />}{action === 'reject' ? 'Confirmar rechazo' : 'Confirmar firma'}</Button>}
      </ModalFooter>
    </Modal>
  </>;
}
