import type { CentroCosto } from "../documents/types/list.types";

export interface Vehicle {
  idvehiculo: number;
  no_vehiculo: string;
  placa: string | null;
  tipo: string | null;
  descripcion: string | null;
  activo: boolean;
  centro_costo_1: CentroCosto | null;
  centro_costo_2: CentroCosto | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VehicleDraft {
  no_vehiculo: string;
  placa: string;
  tipo: string;
  descripcion: string;
  activo: boolean;
  centro_costo_1_id: number | null;
  centro_costo_2_id: number | null;
}
