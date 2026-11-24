import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DirectExpedientDrawer from './DirectExpedientDrawer';
import { hasPermission } from '../../../helpers/portal-access';
jest.mock('../../../helpers/portal-access', () => ({ hasPermission: jest.fn() }));
const fetchMock = jest.fn();
const doc = { documentid: 20, documentserial: 'F001', documentnumber: '44', suppliername: 'Proveedor', suppliernumber: '20100000001', currency: 'PEN', totalamount: 100 } as any;
const row = { id: 5, snapshot: { reference: 'F001-44', supplier: 'Proveedor', currency: 'PEN', total: '100' }, reason: 'Servicio', status: 'PENDING', events: [], can_act: true, next_level: 'SENIOR', senior: 'Senior', creator: 'Usuario' };
const response = (data: unknown) => Promise.resolve({ ok: true, json: async () => ({ success: true, data }) });
beforeEach(() => { jest.clearAllMocks(); global.fetch = fetchMock; (hasPermission as jest.Mock).mockReturnValue(true); });
test('exige motivo y Senior antes de enviar el registro guardado', async () => {
  fetchMock.mockImplementation((path: string, options?: RequestInit) => options?.method === 'POST' ? response(row) : response(path.includes('approvers') ? [{id: 2, name: 'Senior', level: 'SENIOR'}] : path.includes('/documents/') ? doc : []));
  const changed = jest.fn(); render(<DirectExpedientDrawer document={doc} onClose={jest.fn()} onChanged={changed} />);
  const send = await screen.findByRole('button', { name: 'Enviar a aprobación sin OC/OS' }); expect(send).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo por el que no requiere OC/OS'), {target: {value: 'Servicio autorizado'}}); expect(send).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Firmante Senior'), {target: {value: '2'}}); fireEvent.click(send);
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  const body = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')![1].body as FormData;
  expect(body.get('document_id')).toBe('20'); expect(body.get('reason')).toBe('Servicio autorizado');
});
test('no duplica un envío existente y exige comentario para aprobar', async () => {
  fetchMock.mockResolvedValue({ok:true,json:async()=>({success:true,data:row})});
  render(<DirectExpedientDrawer requestId={5} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Aprobar SENIOR' }));
  expect(screen.queryByRole('button',{name:'Enviar a aprobación sin OC/OS'})).not.toBeInTheDocument();
  const confirm=screen.getByRole('button',{name:'Confirmar decisión'}); expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Comentario de la decisión'),{target:{value:'Revisado'}}); fireEvent.click(confirm);
  await waitFor(()=>expect(fetchMock.mock.calls.some(([path, options])=>path.includes('/5/action/')&&options?.method==='POST')).toBe(true));
});
test('sin permiso de envío no ofrece crear solicitudes', async () => {
  (hasPermission as jest.Mock).mockReturnValue(false); fetchMock.mockImplementation((path:string)=>response(path.includes('/documents/')?doc:[]));
  render(<DirectExpedientDrawer document={doc} onClose={jest.fn()} />);
  await screen.findByText('F001-44'); expect(screen.queryByRole('button',{name:'Enviar a aprobación sin OC/OS'})).not.toBeInTheDocument();
});
