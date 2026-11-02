import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CommercialInvoice from "./CommercialInvoice";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

const props = () => ({
  orderId: 15, invoiceId: 42, userId: 7, name: "original.pdf", url: "https://r2.example/original.pdf",
  canReplace: true, onBusyChange: jest.fn(), onReplaced: jest.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  global.fetch = jest.fn();
  URL.createObjectURL = jest.fn().mockReturnValue("blob:new-invoice");
  URL.revokeObjectURL = jest.fn();
});

test("shows the original and keeps replacement disabled when the order is signed", () => {
  render(<CommercialInvoice {...props()} canReplace={false} />);
  expect((screen.getByRole("button", { name: "Sustituir factura comercial" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Ver factura comercial: original.pdf" }));
  expect(screen.getByTitle("original.pdf").getAttribute("src")).toBe("https://r2.example/original.pdf");
  expect(fetch).not.toHaveBeenCalled();
});

test("previews a selected file and only saves it after confirmation", async () => {
  const callbacks = props();
  const updated = { documentid: 42, documenturl: "https://r2.example/new.pdf" };
  (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, data: updated }) });
  render(<CommercialInvoice {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: "Sustituir factura comercial" }));
  const file = new File(["%PDF-1.7 NEW"], "new.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Nueva factura comercial (PDF)"), { target: { files: [file] } });
  expect(screen.getByTitle("Vista previa de la nueva factura comercial").getAttribute("src")).toBe("blob:new-invoice");
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar sustitución" }));
  await waitFor(() => expect(callbacks.onReplaced).toHaveBeenCalledWith(updated));
  const [url, options] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toContain("purchase-orders/15/commercial-invoice/");
  expect(options.method).toBe("POST");
  expect(options.body.get("file")).toBe(file);
  expect(options.body.get("document_id")).toBe("42");
  expect(options.body.get("updated_by")).toBe("7");
  expect(screen.getByRole("status").textContent).toContain("sustituida correctamente");
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:new-invoice");
});

test("canceling a replacement preserves the original without sending a request", () => {
  render(<CommercialInvoice {...props()} />);
  fireEvent.click(screen.getByRole("button", { name: "Sustituir factura comercial" }));
  fireEvent.change(screen.getByLabelText("Nueva factura comercial (PDF)"), {
    target: { files: [new File(["%PDF-1.7 NEW"], "new.pdf", { type: "application/pdf" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByTitle("Vista previa de la nueva factura comercial")).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:new-invoice");
});

test("server rejection keeps the original and explains why it cannot be replaced", async () => {
  const callbacks = props();
  (fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ detail: "La orden ya está firmada." }) });
  render(<CommercialInvoice {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: "Sustituir factura comercial" }));
  fireEvent.change(screen.getByLabelText("Nueva factura comercial (PDF)"), {
    target: { files: [new File(["%PDF-1.7 NEW"], "new.pdf", { type: "application/pdf" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar sustitución" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("ya está firmada"));
  expect(callbacks.onReplaced).not.toHaveBeenCalled();
  expect(callbacks.onBusyChange).toHaveBeenLastCalledWith(false);
});
