import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ExpedientAdjustments from "./ExpedientAdjustments";
import { hasPermission } from "../../../helpers/portal-access";
jest.mock("../../../helpers/portal-access", () => ({ hasPermission: jest.fn() }));
const fetchMock = jest.fn();
const response = (data: unknown, ok = true) => ({ ok, json: async () => ({ success: ok, data, message: ok ? "" : "Operación no autorizada" }) });
const summary = { original_total: "1000", approved_debits: "0", approved_credits: "0", adjusted_total: "1000", adjusted_net: "1000", settled_amount: "1000", balance: "0", pending_adjustments: 0, payment_status: "Pagado" };
const pending = { id: 4, expediente_id: 10, order_number: "OC-001", invoice_reference: "F001-123", kind: "ND", reference: "FD01-15", currency: "PEN", amount: "150", net_amount: "150", reason: "Precio adicional", status: "PENDING", created_by: "Creador", junior_name: "Junior", senior_name: "Senior", next_level: "JR", can_approve: true, events: [] };
beforeEach(() => { jest.clearAllMocks(); global.fetch = fetchMock; (hasPermission as jest.Mock).mockReturnValue(true); });

test("vincula una nota solo al confirmar factura y motivo, luego refresca el saldo", async () => {
  fetchMock.mockImplementation((path: string, options?: RequestInit) => {
    if (options?.method === "POST") return Promise.resolve(response(pending));
    if (path.includes("available-notes")) return Promise.resolve(response([{ id: 15, kind: "ND", reference: "FD01-15", currency: "PEN", amount: "150", date: "2026-11-23" }]));
    return Promise.resolve(response({ adjustments: [], financial_summary: summary }));
  });
  const changed = jest.fn();
  render(<ExpedientAdjustments expedientId={10} invoiceReference="F001-123" onChanged={changed} />);
  fireEvent.click(await screen.findByRole("button", { name: "Vincular NC / ND" }));
  fireEvent.click(await screen.findByRole("radio", { name: "Seleccionar FD01-15" }));
  const submit = screen.getByRole("button", { name: "Anexar y enviar a aprobación" });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Motivo del ajuste"), { target: { value: "Diferencia revisada" } });
  expect(submit).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(submit);
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  const post = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(post![1].body)).toEqual({ note_id: 15, reason: "Diferencia revisada", invoice_reference: "F001-123" });
});

test("un firmante debe confirmar su decisión con comentario", async () => {
  fetchMock.mockImplementation((_path: string, options?: RequestInit) => Promise.resolve(response(options ? pending : [pending])));
  render(<ExpedientAdjustments />);
  fireEvent.click(await screen.findByRole("button", { name: "Aprobar JR" }));
  expect(screen.getByRole("button", { name: "Confirmar decisión" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Comentario de aprobación"), { target: { value: "Revisado" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar decisión" }));
  await screen.findByText(/Operación registrada/);
  expect(fetchMock.mock.calls.find(([, options]) => options?.method === "POST")![0]).toContain("expedientes/10/adjustments/4/action/");
});

test("un expediente cerrado permite consultar pero bloquea vinculación y firmas", async () => {
  fetchMock.mockResolvedValue(response({ adjustments: [pending], financial_summary: summary }));
  render(<ExpedientAdjustments expedientId={10} closed />);
  await screen.findByText("ND · FD01-15");
  expect(screen.queryByRole("button", { name: "Vincular NC / ND" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aprobar JR" })).not.toBeInTheDocument();
});

test("sin permiso de vinculación no ofrece anexar NC/ND", async () => {
  (hasPermission as jest.Mock).mockReturnValue(false);
  fetchMock.mockResolvedValue(response({ adjustments: [], financial_summary: summary }));
  render(<ExpedientAdjustments expedientId={10} />);
  await screen.findByText("No hay NC/ND vinculadas a esta orden.");
  expect(screen.queryByRole("button", { name: "Vincular NC / ND" })).not.toBeInTheDocument();
});
