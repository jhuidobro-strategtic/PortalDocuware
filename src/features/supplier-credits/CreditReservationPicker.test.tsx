import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreditReservationPicker from "./CreditReservationPicker";
import { hasPermission } from "../../helpers/portal-access";
jest.mock("../../helpers/portal-access", () => ({ hasPermission: jest.fn() }));
const fetchMock = jest.fn();
const source = { id: 10, document: "F001-123", available: "200.00", currency: "PEN" };
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; (hasPermission as jest.Mock).mockReturnValue(true); });

test("alerta del saldo y selecciona el importe sin modificar el documento", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [source] }) });
  const changed = jest.fn(); render(<CreditReservationPicker ruc="20100000001" currency="PEN" value={[]} onChange={changed} />);
  const input = await screen.findByRole("spinbutton", { name: "Importe a reservar" });
  fireEvent.change(input, { target: { value: "150" } });
  expect(changed).toHaveBeenLastCalledWith([{ source_id: 10, amount: "150", reason: "Aplicación de saldo a favor a nueva orden / factura" }]);
  expect(fetchMock.mock.calls[0][0]).toContain("ruc=20100000001&currency=PEN&available=1");
});

test("sin permiso de reserva muestra la alerta pero no permite seleccionar importes", async () => {
  (hasPermission as jest.Mock).mockReturnValue(false);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [source] }) });
  render(<CreditReservationPicker ruc="20100000001" onChange={jest.fn()} />);
  await screen.findByText("Este proveedor tiene saldos a favor disponibles.");
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});

test("al cambiar proveedor descarta la selección anterior", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });
  const changed = jest.fn(); const picks = [{ source_id: 10, amount: "200", reason: "Saldo" }];
  const { rerender } = render(<CreditReservationPicker ruc="20100000001" value={picks} onChange={changed} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  rerender(<CreditReservationPicker ruc="20100000002" value={picks} onChange={changed} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(changed).toHaveBeenLastCalledWith([]);
});
