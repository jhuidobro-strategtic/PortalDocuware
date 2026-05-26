import {
  ScheduleExpenseRequest,
  ScheduleExpenseRequestDetail,
  ScheduleTrip,
  TripReference,
  UserApiItem,
} from "./types";

const mapTripReference = (
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

const mapDriverReference = (item: any): TripReference | null => {
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

export const mapExpenseRequestDetail = (item: any): ScheduleExpenseRequestDetail => ({
  expenseDetailId: Number(item.expense_detail_id ?? 0),
  conceptLabel: String(item.concept?.nombre_concepto ?? "").trim(),
  budgetedAmount: String(item.budgeted_amount ?? "").trim(),
  notes: String(item.notes ?? "").trim(),
});

export const mapExpenseRequest = (item: any): ScheduleExpenseRequest => ({
  idRequest: Number(item.id_request ?? 0),
  requestNumber: String(item.request_number ?? "").trim(),
  requesterId: Number(item.requester_name ?? 0),
  reason: String(item.reason ?? "").trim(),
  totalBudget: String(item.total_budget ?? "").trim(),
  statusLabel: String(item.status_data?.descripcion ?? item.status ?? "").trim(),
  createdAt: String(item.created_at ?? "").trim(),
  updatedAt: String(item.updated_at ?? "").trim(),
  details: Array.isArray(item.details) ? item.details.map(mapExpenseRequestDetail) : [],
});

export const mapApiTrip = (item: any): ScheduleTrip => ({
  idTrip: Number(item.id_trip ?? 0),
  tripNumber: String(item.trip_number ?? "").trim(),
  vehicle: mapTripReference(item.vehicle, "idvehiculo", "no_vehiculo"),
  driver: mapDriverReference(item.driver),
  origin: mapTripReference(item.origin_data, "idorigen", "nombre_origen"),
  destination: mapTripReference(
    item.destination_data,
    "idorigen",
    "nombre_origen"
  ),
  departureDate: String(item.departure_date ?? "").trim(),
  returnDate: String(item.return_date ?? "").trim(),
  notes: String(item.notes ?? "").trim(),
  status: Boolean(item.status),
  createdAt: String(item.created_at ?? "").trim(),
  updatedAt: String(item.updated_at ?? "").trim(),
  expenseRequests: Array.isArray(item.expense_requests)
    ? item.expense_requests.map(mapExpenseRequest)
    : [],
});

export const mapApiUser = (item: any): UserApiItem => ({
  userID: Number(item.userID ?? item.userid ?? item.id ?? 0),
  userName: String(item.userName ?? item.username ?? "").trim(),
  fullName: String(item.fullName ?? item.fullname ?? "").trim(),
});

export const mapUserLookup = (users: UserApiItem[]) =>
  users.reduce<Record<number, string>>((acc, item) => {
    const label =
      String(item.fullName ?? "").trim() ||
      String(item.userName ?? "").trim() ||
      String(item.userID);

    acc[item.userID] = label;
    return acc;
  }, {});
