import { buildApiUrl } from "../../helpers/api-url";
import { getApiErrorMessage } from "../../helpers/api-error-message";
import type { CentroCosto } from "../documents/types/list.types";
import type { Vehicle, VehicleDraft } from "./types";

const readResponse = async (response: Response) => {
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false || !result) {
    throw new Error(getApiErrorMessage(result, `No fue posible completar la solicitud (HTTP ${response.status}).`));
  }
  return result?.data ?? result;
};

const fetchList = async <T,>(path: string, signal?: AbortSignal): Promise<T[]> => {
  const rows = await readResponse(await fetch(buildApiUrl(path), { signal }));
  if (!Array.isArray(rows)) throw new Error("El servidor no devolvió un listado válido.");
  return rows;
};

export const loadVehicleData = (signal?: AbortSignal) => Promise.all([
  fetchList<Vehicle>("vehiculos/?include_inactive=true", signal),
  fetchList<CentroCosto>("centro-costo/", signal),
  fetchList<CentroCosto>("centro-costo-2/", signal),
]);

export const saveVehicle = async (draft: VehicleDraft, actor: number, vehicleId?: number): Promise<Vehicle> => {
  if (!actor) throw new Error("No fue posible identificar al usuario. Inicie sesión nuevamente.");
  return readResponse(await fetch(buildApiUrl(vehicleId ? `vehiculos/${vehicleId}/` : "vehiculos/"), {
    method: vehicleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, placa: draft.placa.trim() || null,
      ...(vehicleId ? { updated_by: actor } : { created_by: actor }) }),
  }));
};

export const setVehicleActive = async (id: number, active: boolean, actor: number): Promise<Vehicle> => {
  if (!actor) throw new Error("No fue posible identificar al usuario. Inicie sesión nuevamente.");
  return readResponse(await fetch(buildApiUrl(`vehiculos/${id}/`), { method: "PATCH",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: active, updated_by: actor }) }));
};
