import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PreOrderSignatureInbox from './PreOrderSignatureInbox';
import { actOnPreOrder, getPreOrderSignatureInbox } from '../../preorders/services';
import { hasPermission } from '../../../helpers/portal-access';
import { PreOrder } from '../../preorders/types';

jest.mock('../../preorders/services', () => ({ actOnPreOrder: jest.fn(), getPreOrderSignatureInbox: jest.fn() }));
jest.mock('../../../helpers/portal-access', () => ({ hasPermission: jest.fn() }));

const row: PreOrder = {
  id: 7, title: 'Suministros para almacén', status: 'PENDING', source_kind: 'COTIZACION', source_reference: 'COT-7',
  supplier_id: 1, supplier_name: 'Proveedor de prueba', supplier_ruc: '20111111111',
  creator_id: 10, creator_name: 'Creador', junior_id: 20, junior_name: 'Junior asignado', senior_id: 30, senior_name: 'Senior asignado', order_type: 'C',
  order_data: { currency: 1, paymentCondition: 1, store: 1, guideNo: '', requiredby: 'Almacén', details: [{ descriptionItem: 'Papel', quantity: '2', unitPrice: '10' }] },
  tracking_number: null, approved_at: null, created_at: '2026-11-23', invoice_job: null,
  invoice_id: null, converted_order_id: null, converted_order_number: null, expedient_id: null,
  files: [{ id: 1, filename: 'cotizacion.pdf', url: 'https://example.com/quote.pdf', created_at: '2026-11-23' }], events: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (hasPermission as jest.Mock).mockReturnValue(true);
  (getPreOrderSignatureInbox as jest.Mock).mockResolvedValue([row]);
});
const show = (userId = 30, approvalRole = 'SENIOR') => render(<MemoryRouter><PreOrderSignatureInbox userId={userId} approvalRole={approvalRole} currencyLookup={{ 1: 'Soles' }} /></MemoryRouter>);

test('reviews sustento and records Senior signature without creating an order', async () => {
  (actOnPreOrder as jest.Mock).mockResolvedValue({ ...row, status: 'WAITING_INVOICE', approved_at: '2026-11-23', tracking_number: 'PRE-2026-0001' });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Firmar como Senior' }));
  expect(screen.getByRole('link', { name: 'cotizacion.pdf' })).toHaveAttribute('href', row.files[0].url);
  expect(screen.getByText('Papel')).toBeInTheDocument();
  expect(screen.getByText(/Moneda: Soles/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Observaciones de firma'), { target: { value: 'Revisado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar firma' }));
  await waitFor(() => expect(actOnPreOrder).toHaveBeenCalledWith(7, 'approve', 30, { notes: 'Revisado' }));
  expect(await screen.findByText(/Firma Senior registrada/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Firmar como Senior' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ir a vincular comprobante' })).toHaveAttribute('href', '/pre-orders');
});

test('Junior signature leaves the pre-order pending for Senior', async () => {
  (actOnPreOrder as jest.Mock).mockResolvedValue({ ...row, status: 'JR_SIGNED', junior_signed_at: '2026-11-23' });
  show(20, 'JR');
  fireEvent.click(await screen.findByRole('button', { name: 'Firmar como Junior' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar firma' }));
  expect(await screen.findByText('Firma Junior registrada. Pendiente de firma Senior.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Firmar como Junior' })).not.toBeInTheDocument();
});

test('unassigned readers cannot sign or reject', async () => {
  show(10, 'SENIOR');
  await screen.findByText(row.title);
  expect(screen.queryByRole('button', { name: /Firmar como/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Rechazar preorden/ })).not.toBeInTheDocument();
});

test('signature permission is required even for the assigned Senior', async () => {
  (hasPermission as jest.Mock).mockReturnValue(false);
  show();
  await screen.findByText(row.title);
  expect(screen.queryByRole('button', { name: /Firmar como/ })).not.toBeInTheDocument();
});

test('rejection requires a reason and removes the row from the signature inbox', async () => {
  (actOnPreOrder as jest.Mock).mockResolvedValue({ ...row, status: 'REJECTED' });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Rechazar preorden #7' }));
  expect(screen.getByRole('button', { name: 'Confirmar rechazo' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo del rechazo *'), { target: { value: 'Corregir importe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
  expect(await screen.findByText(/Preorden rechazada/)).toBeInTheDocument();
  expect(screen.queryByText(row.title)).not.toBeInTheDocument();
});

test('failed signatures keep the pre-order available for review', async () => {
  (actOnPreOrder as jest.Mock).mockRejectedValue(new Error('La preorden ya no está pendiente.'));
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Firmar como Senior' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar firma' }));
  expect(await screen.findByText('La preorden ya no está pendiente.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirmar firma' })).not.toBeDisabled();
});
