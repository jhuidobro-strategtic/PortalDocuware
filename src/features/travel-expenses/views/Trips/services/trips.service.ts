import moment from "moment";
import { buildApiUrl } from "../../../../../helpers/api-url";
import { getAuthHeaders, getCurrentSessionUser } from "../../../my-schedule/shared/session";

export interface TripReference {
  id: number;
  label: string;
}

export interface TripItem {
  idTrip: number;
  tripNumber: string;
  vehicle: TripReference | null;
  driver: TripReference | null;
  origin: TripReference | null;
  destination: TripReference | null;
  departureDate: string;
  returnDate: string;
  notes: string;
  status: boolean;
  createdAt: string;
  configurationId?: number;
  configurationCode?: string;
  configurationData?: any;
  units?: any[];
  semiPlates?: string[];
  tractoPlate?: string;
  trailerPlates?: string[];
}

export interface VehicleItem {
  idvehiculo: number;
  no_vehiculo: string;
}

export interface DriverItem {
  userID: number;
  userName?: string;
  fullName?: string;
  profileID?: number;
}

export interface DestinationItem {
  idorigen: number;
  nombre_origen: string;
}

export interface TripConfigurationItem {
  id_configuration: number;
  code: string;
  name: string;
  description?: string;
  trailer_count: number;
  axle_count: number;
  is_active: boolean;
}

export interface VehicleConfiguration {
  id?: number;
  code: string;
  name?: string;
  label: string;
  axles: number;
  tractoUnits: number;
  semiUnits: number;
}

export const mapApiTripConfiguration = (item: any): VehicleConfiguration => ({
  id: Number(item.id_configuration ?? item.id ?? 0),
  code: String(item.code ?? "").trim(),
  name: String(item.name ?? "").trim(),
  label: `${item.code} · ${item.name || item.code}`,
  axles: Number(item.axle_count ?? item.axles ?? 0),
  tractoUnits: 1,
  semiUnits: Number(item.trailer_count ?? item.semiUnits ?? 0),
});

export const VEHICLE_CONFIGURATIONS: VehicleConfiguration[] = [
  { id: 1, code: "T3", label: "T3 · Solo tracto", axles: 3, tractoUnits: 1, semiUnits: 0 },
  { id: 2, code: "T3S3", label: "T3S3 · Tracto + semirremolque", axles: 6, tractoUnits: 1, semiUnits: 1 },
  { id: 3, code: "T3S2S2", label: "T3S2S2 · Bitren", axles: 7, tractoUnits: 1, semiUnits: 2 },
  { id: 4, code: "T3S2", label: "T3S2 · Tracto + semirremolque", axles: 5, tractoUnits: 1, semiUnits: 1 },
  { id: 5, code: "T2S1", label: "T2S1 · Tracto + semirremolque", axles: 3, tractoUnits: 1, semiUnits: 1 },
  { id: 6, code: "T2S2", label: "T2S2 · Tracto + semirremolque", axles: 4, tractoUnits: 1, semiUnits: 1 },
  { id: 7, code: "T2S3", label: "T2S3 · Tracto + semirremolque", axles: 5, tractoUnits: 1, semiUnits: 1 },
  { id: 8, code: "C3", label: "C3 · Camión 3 ejes", axles: 3, tractoUnits: 1, semiUnits: 0 },
  { id: 9, code: "C2", label: "C2 · Camión 2 ejes", axles: 2, tractoUnits: 1, semiUnits: 0 },
  { id: 10, code: "C3R2", label: "C3R2 · Camión + remolque", axles: 5, tractoUnits: 1, semiUnits: 1 },
  { id: 11, code: "C3R3", label: "C3R3 · Camión + remolque", axles: 6, tractoUnits: 1, semiUnits: 1 },
];

export interface BatchTripRow {
  rowId: string;
  tripNumber: string;
  driverId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  vehicleId: string; // Tracto
  configurationCode: string;
  configurationId?: number;
  semiPlates: string[];
  foodCost: string;
  lodgingCost: string;
  costPerAxle: string;
  tollCount: string;
  notes: string;
  status: boolean;
}

export const createEmptyBatchTripRow = (index = 1): BatchTripRow => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const randomNum = String(index).padStart(4, "0");
  return {
    rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tripNumber: `VJ-${yy}-${randomNum}`,
    driverId: "",
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    vehicleId: "",
    configurationCode: "",
    configurationId: undefined,
    semiPlates: [],
    foodCost: "",
    lodgingCost: "",
    costPerAxle: "",
    tollCount: "",
    notes: "",
    status: true,
  };
};

export interface TripFormValues {
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  notes: string;
  status: boolean;
  configurationId?: string;
  configurationCode?: string;
}

export type TripFormField =
  | "tripNumber"
  | "vehicleId"
  | "driverId"
  | "origin"
  | "destination"
  | "departureDate"
  | "returnDate";

export type TripFormErrors = Partial<Record<TripFormField, string>>;

export interface CreateTripPayload {
  trip_number: string;
  vehicle_id: number;
  driver_id: number;
  origin: number;
  destination: number;
  departure_date: string;
  return_date: string;
  notes: string;
  status: boolean;
  created_by: number;
  configuration_id?: number;
  configuration_code?: string;
  tractor_id?: number;
}

export interface UpdateTripPayload extends CreateTripPayload {
  id_trip: number;
}

export const DATE_TIME_INPUT_FORMAT = "YYYY-MM-DDTHH:mm";

export const createEmptyTripForm = (): TripFormValues => ({
  tripNumber: "",
  vehicleId: "",
  driverId: "",
  origin: "",
  destination: "",
  departureDate: "",
  returnDate: "",
  notes: "",
  status: true,
});

export const mapTripReference = (
  item: any,
  idKey: string,
  labelKey: string
): TripReference | null => {
  if (!item) {
    return null;
  }

  const id = Number(item[idKey] ?? 0);
  const label = String(item[labelKey] ?? "").trim();

  if (!id && !label) {
    return null;
  }

  return {
    id,
    label,
  };
};

export const mapApiDriver = (item: any): DriverItem => ({
  userID: Number(item.userID ?? item.userid ?? item.id ?? 0),
  userName: String(item.userName ?? item.username ?? "").trim(),
  fullName: String(item.fullName ?? item.fullname ?? "").trim(),
  profileID: Number(
    item.profileID ??
      item.profile_id ??
      item.profile?.profileID ??
      item.profile?.profile_id ??
      0
  ),
});

export const mapDriverReference = (item: any): TripReference | null => {
  if (!item) {
    return null;
  }

  const id = Number(item.idconductor ?? item.userID ?? item.userid ?? item.id ?? 0);
  const label = String(
    item.conductor_nm ??
      item.fullName ??
      item.fullname ??
      item.userName ??
      item.username ??
      ""
  ).trim();

  if (!id && !label) {
    return null;
  }

  return {
    id,
    label,
  };
};

export const mapApiTrip = (item: any): TripItem => {
  const trailerUnits = Array.isArray(item.units)
    ? item.units
        .filter(
          (u: any) =>
            u.unit_type === "REMOLQUE" ||
            u.unit_type === "SEMIRREMOLQUE" ||
            (u.position != null && u.position > 0)
        )
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    : [];

  const trailerPlates = trailerUnits
    .map((u: any) => {
      if (u.vehicle?.no_vehiculo) return String(u.vehicle.no_vehiculo).trim();
      if (u.no_vehiculo) return String(u.no_vehiculo).trim();
      if (typeof u.vehicle === "string" && u.vehicle.includes("no_vehiculo=")) {
        return u.vehicle.split("no_vehiculo=")[1]?.replace(/[}\s]/g, "") || "";
      }
      return "";
    })
    .filter(Boolean);

  const semiPlates = trailerUnits.map((u: any) =>
    String(u.vehicle_id || u.vehicle?.idvehiculo || "")
  );

  const tractoUnit = Array.isArray(item.units)
    ? item.units.find(
        (u: any) => u.unit_type === "TRACTO" || u.position === 0
      )
    : null;

  let rawTractoPlate = "";
  if (tractoUnit) {
    if (tractoUnit.vehicle?.no_vehiculo) {
      rawTractoPlate = String(tractoUnit.vehicle.no_vehiculo).trim();
    } else if (tractoUnit.no_vehiculo) {
      rawTractoPlate = String(tractoUnit.no_vehiculo).trim();
    } else if (
      typeof tractoUnit.vehicle === "string" &&
      tractoUnit.vehicle.includes("no_vehiculo=")
    ) {
      rawTractoPlate =
        tractoUnit.vehicle.split("no_vehiculo=")[1]?.replace(/[}\s]/g, "") || "";
    }
  }

  const initialVehicleRef =
    mapTripReference(item.vehicle, "idvehiculo", "no_vehiculo");

  const tractoPlate =
    (item.vehicle?.no_vehiculo ? String(item.vehicle.no_vehiculo).trim() : "") ||
    rawTractoPlate ||
    (initialVehicleRef?.label ? String(initialVehicleRef.label).trim() : "");

  const vehicleRef =
    initialVehicleRef ||
    (item.vehicle_id
      ? { id: Number(item.vehicle_id), label: tractoPlate }
      : tractoUnit
      ? {
          id: Number(tractoUnit.vehicle_id || tractoUnit.vehicle?.idvehiculo),
          label: tractoPlate,
        }
      : null);

  const driverRef =
    mapDriverReference(item.driver) ||
    (item.driver_id ? { id: Number(item.driver_id), label: "" } : null);

  const originRef =
    mapTripReference(item.origin_data, "idorigen", "nombre_origen") ||
    (item.origin ? { id: Number(item.origin), label: "" } : null);

  const destinationRef =
    mapTripReference(item.destination_data, "idorigen", "nombre_origen") ||
    (item.destination ? { id: Number(item.destination), label: "" } : null);

  const configurationId =
    Number(
      item.configuration_id ?? item.configuration_data?.id_configuration ?? 0
    ) || undefined;

  const configurationCode = String(
    item.configuration_data?.code ?? item.configuration_code ?? ""
  ).trim();

  return {
    idTrip: Number(item.id_trip ?? 0),
    tripNumber: String(item.trip_number ?? "").trim(),
    vehicle: vehicleRef,
    driver: driverRef,
    origin: originRef,
    destination: destinationRef,
    departureDate: String(item.departure_date ?? "").trim(),
    returnDate: String(item.return_date ?? "").trim(),
    notes: String(item.notes ?? "").trim(),
    status: Boolean(item.status),
    createdAt: String(item.created_at ?? "").trim(),
    configurationId,
    configurationCode,
    configurationData: item.configuration_data,
    units: item.units || [],
    semiPlates,
    tractoPlate,
    trailerPlates,
  };
};

export const mapTripToFormValues = (trip: TripItem): TripFormValues => ({
  tripNumber: trip.tripNumber,
  vehicleId: trip.vehicle ? String(trip.vehicle.id) : "",
  driverId: trip.driver ? String(trip.driver.id) : "",
  origin: trip.origin ? String(trip.origin.id) : "",
  destination: trip.destination ? String(trip.destination.id) : "",
  departureDate: moment(trip.departureDate, moment.ISO_8601, true).isValid()
    ? moment(trip.departureDate).format(DATE_TIME_INPUT_FORMAT)
    : "",
  returnDate: moment(trip.returnDate, moment.ISO_8601, true).isValid()
    ? moment(trip.returnDate).format(DATE_TIME_INPUT_FORMAT)
    : "",
  notes: trip.notes,
  status: trip.status,
});

export const validateTripForm = (
  values: TripFormValues,
  t: (key: string, options?: Record<string, unknown>) => string
): TripFormErrors => {
  const errors: TripFormErrors = {};
  const parsedDepartureDate = moment(
    values.departureDate,
    DATE_TIME_INPUT_FORMAT,
    true
  );
  const parsedReturnDate = moment(values.returnDate, DATE_TIME_INPUT_FORMAT, true);

  if (!values.tripNumber.trim()) {
    errors.tripNumber = t("Complete the {{field}} field.", {
      field: t("Trip Number"),
    });
  }

  if (!values.vehicleId.trim()) {
    errors.vehicleId = t("Complete the {{field}} field.", {
      field: t("Vehicle"),
    });
  }

  if (!values.driverId.trim()) {
    errors.driverId = t("Complete the {{field}} field.", {
      field: t("Driver"),
    });
  }

  if (!values.origin.trim() || Number(values.origin) <= 0) {
    errors.origin = t("Complete the {{field}} field.", {
      field: t("Origin"),
    });
  }

  if (!values.destination.trim() || Number(values.destination) <= 0) {
    errors.destination = t("Complete the {{field}} field.", {
      field: t("Destination"),
    });
  }

  if (!parsedDepartureDate.isValid()) {
    errors.departureDate = t("Complete the {{field}} field.", {
      field: t("Departure Date"),
    });
  }

  if (!parsedReturnDate.isValid()) {
    errors.returnDate = t("Complete the {{field}} field.", {
      field: t("Return Date"),
    });
  } else if (
    parsedDepartureDate.isValid() &&
    parsedReturnDate.isBefore(parsedDepartureDate)
  ) {
    errors.returnDate = t("Return date must be after departure date.");
  }

  return errors;
};

export const fetchTrips = async (): Promise<TripItem[]> => {
  const response = await fetch(buildApiUrl("trips/"), {
    cache: "no-store",
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
    throw new Error(data?.message || "Error loading trips");
  }

  return (data.data as any[]).map(mapApiTrip);
};

export const fetchTripById = async (id: number): Promise<TripItem> => {
  try {
    const response = await fetch(buildApiUrl(`trips/${id}/`), {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => null);

    if (response.ok && data?.success && data?.data) {
      return mapApiTrip(data.data);
    }
  } catch {
    // Fallback to searching in trips list
  }

  const allTrips = await fetchTrips();
  const matchedTrip = allTrips.find((t) => t.idTrip === id);
  if (matchedTrip) {
    return matchedTrip;
  }

  throw new Error("Trip not found");
};

export const fetchTripConfigurations = async (): Promise<VehicleConfiguration[]> => {
  try {
    const response = await fetch(buildApiUrl("trip-configurations/"), {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => null);

    if (response.ok && data?.success && Array.isArray(data?.data)) {
      const items = (data.data as any[])
        .filter((item) => item.is_active !== false)
        .map(mapApiTripConfiguration);
      if (items.length > 0) {
        return items;
      }
    }
  } catch (err) {
    console.error("Error loading trip configurations:", err);
  }

  return VEHICLE_CONFIGURATIONS;
};

export const fetchTripCatalogs = async () => {
  const headers = getAuthHeaders();
  const [vehiclesResponse, driversResponse, destinationsResponse, configsResponse] =
    await Promise.all([
      fetch(buildApiUrl("vehiculos/"), {
        cache: "no-store",
        headers,
      }),
      fetch(buildApiUrl("users/"), {
        cache: "no-store",
        headers,
      }),
      fetch(buildApiUrl("destinos/"), {
        cache: "no-store",
        headers,
      }),
      fetch(buildApiUrl("trip-configurations/"), {
        cache: "no-store",
        headers,
      }).catch(() => null),
    ]);

  const [vehiclesData, driversData, destinationsData, configsData] = await Promise.all([
    vehiclesResponse.json().catch(() => null),
    driversResponse.json().catch(() => null),
    destinationsResponse.json().catch(() => null),
    configsResponse ? configsResponse.json().catch(() => null) : null,
  ]);

  if (!vehiclesResponse.ok || !Array.isArray(vehiclesData)) {
    throw new Error("Error loading vehicles catalog");
  }

  if (!driversResponse.ok || !driversData?.success || !Array.isArray(driversData?.data)) {
    throw new Error("Error loading drivers catalog");
  }

  if (
    !destinationsResponse.ok ||
    !destinationsData?.success ||
    !Array.isArray(destinationsData?.data)
  ) {
    throw new Error(destinationsData?.message || "Error loading destinations catalog");
  }

  const vehicles: VehicleItem[] = vehiclesData as VehicleItem[];
  const drivers: DriverItem[] = (driversData.data as any[])
    .map(mapApiDriver)
    .filter((driver) => driver.profileID === 4);
  const destinations: DestinationItem[] = destinationsData.data as DestinationItem[];

  let configurations: VehicleConfiguration[] = VEHICLE_CONFIGURATIONS;
  if (configsData?.success && Array.isArray(configsData?.data) && configsData.data.length > 0) {
    configurations = (configsData.data as any[])
      .filter((item) => item.is_active !== false)
      .map(mapApiTripConfiguration);
  }

  return { vehicles, drivers, destinations, configurations };
};

export const createTrip = async (
  values: TripFormValues,
  userId: number
): Promise<{ success: boolean; message?: string }> => {
  const payload: CreateTripPayload = {
    trip_number: values.tripNumber.trim(),
    vehicle_id: Number(values.vehicleId),
    driver_id: Number(values.driverId),
    origin: Number(values.origin),
    destination: Number(values.destination),
    departure_date: moment(values.departureDate, DATE_TIME_INPUT_FORMAT, true).toISOString(),
    return_date: moment(values.returnDate, DATE_TIME_INPUT_FORMAT, true).toISOString(),
    notes: values.notes.trim(),
    status: values.status,
    created_by: userId,
    ...(values.configurationId ? { configuration_id: Number(values.configurationId) } : {}),
  };

  const response = await fetch(buildApiUrl("trips/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Error creating trip");
  }

  return data;
};

export const updateTrip = async (
  tripId: number,
  values: TripFormValues,
  userId: number
): Promise<{ success: boolean; message?: string }> => {
  const payload: UpdateTripPayload = {
    trip_number: values.tripNumber.trim(),
    vehicle_id: Number(values.vehicleId),
    tractor_id: Number(values.vehicleId),
    driver_id: Number(values.driverId),
    origin: Number(values.origin),
    destination: Number(values.destination),
    departure_date: formatIsoWithOffset(values.departureDate),
    return_date: formatIsoWithOffset(values.returnDate),
    notes: values.notes.trim(),
    status: values.status,
    created_by: userId,
    id_trip: tripId,
    ...(values.configurationId ? { configuration_id: Number(values.configurationId) } : {}),
    ...(values.configurationCode ? { configuration_code: values.configurationCode } : {}),
  };

  const response = await fetch(buildApiUrl("trips/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Error updating trip");
  }

  return data;
};

export interface BulkTripTrailerItem {
  vehicle_id: number;
}

export interface BulkTripRowPayload {
  row_number: number;
  driver_id: number;
  origin: number;
  destination: number;
  departure_date: string;
  return_date: string;
  configuration_code: string;
  tractor_id: number;
  trailers: BulkTripTrailerItem[];
  notes?: string;
}

export interface BulkCreateTripsPayload {
  created_by: number;
  rows: BulkTripRowPayload[];
}

export interface BulkCreateTripsResultItem {
  row_number: number;
  success: boolean;
  trip_id?: number;
  trip?: any;
  errors?: Record<string, string[]>;
}

export interface BulkCreateTripsResponse {
  success: boolean;
  message: string;
  data?: {
    batch_id?: string;
    total_rows?: number;
    created_rows?: number;
    failed_rows?: number;
    results?: BulkCreateTripsResultItem[];
    rows?: any[];
  };
}

export const formatIsoWithOffset = (dateStr: string): string => {
  if (!dateStr) return "";
  const m = moment(dateStr, ["YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm", moment.ISO_8601]);
  return m.isValid() ? m.format() : dateStr;
};

export const formatForDateTimeInput = (dateStr: string): string => {
  if (!dateStr) return "";
  const m = moment(dateStr);
  return m.isValid() ? m.format("YYYY-MM-DDTHH:mm") : dateStr.slice(0, 16);
};

export const createBulkTrips = async (
  payload: BulkCreateTripsPayload
): Promise<BulkCreateTripsResponse> => {
  const response = await fetch(buildApiUrl("trips/bulk/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data: BulkCreateTripsResponse = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    let detailedMsg = data?.message || "Error al procesar los viajes masivos";

    if (data?.data?.results && Array.isArray(data.data.results)) {
      const errParts = data.data.results
        .filter((r) => !r.success && r.errors)
        .map((r) => {
          const errList = Object.entries(r.errors!)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
            .join("; ");
          return `Fila #${r.row_number}: ${errList}`;
        });
      if (errParts.length > 0) {
        detailedMsg = `${detailedMsg} (${errParts.join(" | ")})`;
      }
    } else if (data?.data?.rows && Array.isArray(data.data.rows)) {
      const errParts = data.data.rows
        .map((rowErr: any, idx: number) => {
          if (rowErr && typeof rowErr === "object") {
            const errList = Object.entries(rowErr)
              .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
              .join("; ");
            return `Fila #${idx + 1}: ${errList}`;
          }
          return null;
        })
        .filter(Boolean);
      if (errParts.length > 0) {
        detailedMsg = `${detailedMsg} (${errParts.join(" | ")})`;
      }
    }

    throw new Error(detailedMsg);
  }

  return data;
};
