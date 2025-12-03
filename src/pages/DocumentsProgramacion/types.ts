export interface Vehiculo {
  idvehiculo: number;
  no_vehiculo: string;
}

export interface Conductor {
  idconductor: number;
  conductor_nm: string;
}

export interface Programacion {
  programacionid: number;
  programacionfecha: string;
  vehiculo: Vehiculo;
  conductor: Conductor;
}

export interface NuevaProgramacion {
  programacionfecha: string;
  idvehiculo: number | null;
  idconductor: number | null;
}

export interface Notification {
  id: number;
  type: "success" | "danger" | "warning" | "info";
  message: string;
}
