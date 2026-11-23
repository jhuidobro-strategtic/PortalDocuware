import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrderDocumentItem from './OrderDocumentItem';
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

test('does not offer deletion unless the parent grants it', () => {
  render(<OrderDocumentItem name="sustento.pdf" type="Sustento" url="https://example.com/file.pdf" />);
  expect(screen.queryByRole('button', { name: /Eliminar documento/ })).not.toBeInTheDocument();
});
test('requires confirmation, permits cancelling and reports deletion progress', async () => {
  const onDelete = jest.fn().mockResolvedValue(undefined), busy = jest.fn();
  render(<OrderDocumentItem name="sustento.pdf" type="Sustento" onDelete={onDelete} onDeleteBusyChange={busy} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar documento: sustento.pdf' }));
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar documento: sustento.pdf' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false));
  expect(busy).toHaveBeenCalledWith(true);
});
test('keeps the document and shows server protection errors', async () => {
  render(<OrderDocumentItem name="sustento.pdf" type="Sustento" onDelete={jest.fn().mockRejectedValue(new Error('Documento protegido'))} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar documento: sustento.pdf' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Documento protegido');
  expect(screen.getByText('sustento.pdf', { selector: 'h6' })).toBeInTheDocument();
});
