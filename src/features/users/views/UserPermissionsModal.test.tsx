import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserPermissionsModal from "./UserPermissionsModal";
const permissions = ["expedients.close", "expedients.reopen", "documents.delete", "documents.read"];
const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; });
test.each([false, true])("las facultades reservadas son fijas y no delegables (autorizado: %s)", async authorized => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ name: "Usuario", role: { name: "ADMINISTRADOR", full_access: false, permissions: [] }, permissions, extra_permissions: [], fixed_permissions: authorized ? permissions.slice(0, 3) : [], can_manage_protected_operations: authorized }) });
  const saved = jest.fn(); render(<UserPermissionsModal userId={10} onClose={jest.fn()} onSaved={saved} />);
  const close = await screen.findByRole("checkbox", { name: /^Cerrar / });
  expect(close).toBeDisabled(); expect((close as HTMLInputElement).checked).toBe(authorized);
  const deletion = screen.getByRole("checkbox", { name: /^Eliminar / });
  expect(deletion).toBeDisabled(); expect((deletion as HTMLInputElement).checked).toBe(authorized);
  fireEvent.click(screen.getByRole("checkbox", { name: "Consultar" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar permisos" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).permissions).toEqual(["documents.read"]);
});

test.each([false, true])("guarda la autorización individual al cambiar solo el control (inicial: %s)", async authorized => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ name: "Usuario", role: { name: "GESTOR DE DOCUMENTOS", full_access: false, permissions: [] }, permissions, extra_permissions: [], can_manage_protected_operations: authorized }) });
  const saved = jest.fn(); render(<UserPermissionsModal userId={10} onClose={jest.fn()} onSaved={saved} />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Autorizar cierre, reapertura y eliminación" }));
  const close = screen.getByRole("checkbox", { name: /^Cerrar / });
  expect((close as HTMLInputElement).checked).toBe(!authorized);
  fireEvent.click(screen.getByRole("button", { name: "Guardar permisos" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ permissions: [], can_manage_protected_operations: !authorized });
});
