import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DocumentOrderStandard from './DocumentOrderStandard';
const categories = ['invoice', 'order', 'credit', 'debit', 'support'];
const original = global.fetch;
afterEach(() => { global.fetch = original; });

test('persists deletion protection with the unchanged standard order', async () => {
  const fetchMock = jest.fn(async (_url: unknown, init?: RequestInit) => ({ ok: true, json: async () => init?.method === 'PATCH'
    ? JSON.parse(init.body as string) : { categories, protected_categories: ['invoice', 'order'] } } as Response));
  global.fetch = fetchMock as typeof fetch;
  render(<DocumentOrderStandard />);
  const support = await screen.findByRole('checkbox', { name: 'Prohibir eliminación de Otros sustentos' });
  expect(screen.getByRole('checkbox', { name: 'Prohibir eliminación de Factura o comprobante' })).toBeChecked();
  expect(support).not.toBeChecked();
  fireEvent.click(support);fireEvent.click(screen.getByRole('button', { name: 'Guardar estándar' }));
  await screen.findByText('Orden y protección documental guardados.');
  const request = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
  expect(JSON.parse(request[1]!.body as string)).toEqual({ categories, protected_categories: ['invoice', 'order', 'support'] });
  expect(screen.getByRole('button', { name: 'Guardar estándar' })).toBeDisabled();
});

test('discard restores protection without writing to the server', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ categories, protected_categories: ['invoice'] }) });
  global.fetch = fetchMock;
  render(<DocumentOrderStandard />);
  const checkbox = await screen.findByRole('checkbox', { name: 'Prohibir eliminación de Otros sustentos' });
  fireEvent.click(checkbox);fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
  await waitFor(() => expect(checkbox).not.toBeChecked());
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
