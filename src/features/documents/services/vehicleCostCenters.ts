import { buildApiUrl } from "../../../helpers/api-url";
import type { CentroCosto, DocumentDetail } from "../types/list.types";

export interface VehicleCostCenters {
  idvehiculo: number;
  placa: string | null;
  no_vehiculo: string;
  centro_costo_1: CentroCosto | null;
  centro_costo_2: CentroCosto | null;
}

export const fetchVehicleCostCenters = async (signal: AbortSignal): Promise<VehicleCostCenters[]> => {
  const response = await fetch(buildApiUrl("vehiculos/"), { signal });
  const payload = await response.json();
  const vehicles = payload?.data ?? payload;
  if (!response.ok || payload?.success === false || !Array.isArray(vehicles)) {
    throw new Error("No fue posible consultar los centros de costo por placa.");
  }
  return vehicles;
};

const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[\s-]/g, "");

export const findVehicleByPlate = (plate: string, vehicles: VehicleCostCenters[]) => {
  const normalized = normalizePlate(plate);
  if (!normalized) return undefined;
  const matches = vehicles.filter((vehicle) =>
    normalizePlate(vehicle.placa?.trim() || vehicle.no_vehiculo || "") === normalized
  );
  return matches.length === 1 ? matches[0] : undefined;
};

export const applyVehicleCostCenters = (
  detail: DocumentDetail, plate: string, vehicle?: VehicleCostCenters
): DocumentDetail => ({
  ...detail,
  extracted_plate: plate,
  ...(vehicle ? {
    costCenter1: vehicle.centro_costo_1?.centroid ?? null,
    costCenter2: vehicle.centro_costo_2?.centroid ?? null,
    centro_costo_1: vehicle.centro_costo_1,
    centro_costo_2: vehicle.centro_costo_2,
  } : {}),
});
