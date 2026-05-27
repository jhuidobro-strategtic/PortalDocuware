import { buildApiUrl } from "../../../../helpers/api-url";
import { mapApiTrip, mapApiUser, mapExpenseRequest, mapUserLookup } from "../shared/mappers";
import { getAuthHeaders, getCurrentSessionUser } from "../shared/session";
import {
  CreateExpenseVoucherInput,
  ScheduleTrip,
  SessionUser,
} from "../shared/types";

export const fetchScheduleTrips = async (
  sessionUser: SessionUser,
  t: (key: string) => string,
  signal?: AbortSignal
): Promise<ScheduleTrip[]> => {
  if (sessionUser.profileId !== 1 && sessionUser.profileId !== 2 && sessionUser.id === null) {
    throw new Error(t("Unable to identify the signed-in user to load this schedule."));
  }

  const tripsPath =
    sessionUser.profileId === 1 || sessionUser.profileId === 2
      ? "trips/"
      : `trips/?driver_id=${encodeURIComponent(String(sessionUser.id))}`;

  const [tripsResponse, requestsResponse] = await Promise.all([
    fetch(buildApiUrl(tripsPath), {
      cache: "no-store",
      headers: getAuthHeaders(),
      signal,
    }),
    fetch(buildApiUrl("expense-requests/"), {
      cache: "no-store",
      headers: getAuthHeaders(),
      signal,
    }),
  ]);
  const [tripsData, requestsData] = await Promise.all([
    tripsResponse.json().catch(() => null),
    requestsResponse.json().catch(() => null),
  ]);

  if (!tripsResponse.ok || !tripsData?.success || !Array.isArray(tripsData?.data)) {
    throw new Error(tripsData?.message || t("Error loading schedule"));
  }

  const requestsByTripId =
    requestsResponse.ok && requestsData?.success && Array.isArray(requestsData?.data)
      ? (requestsData.data as any[]).reduce<Record<number, ReturnType<typeof mapExpenseRequest>[]>>(
          (acc, request) => {
            const tripId = Number(request.id_trip ?? request.trip?.id_trip ?? 0);

            if (!tripId) {
              return acc;
            }

            if (!acc[tripId]) {
              acc[tripId] = [];
            }

            acc[tripId].push(mapExpenseRequest(request));
            return acc;
          },
          {}
        )
      : {};

  return (tripsData.data as any[]).map((item) => {
    const trip = mapApiTrip(item);

    return {
      ...trip,
      expenseRequests:
        requestsByTripId[trip.idTrip] ??
        trip.expenseRequests,
    };
  });
};

export const fetchScheduleDetail = async (
  tripId: number,
  t: (key: string) => string,
  signal?: AbortSignal
) => {
  const [tripResponse, requestsResponse, usersResponse] = await Promise.all([
    fetch(buildApiUrl(`trips/${tripId}/`), {
      cache: "no-store",
      headers: getAuthHeaders(),
      signal,
    }),
    fetch(buildApiUrl("expense-requests/"), {
      cache: "no-store",
      headers: getAuthHeaders(),
      signal,
    }),
    fetch(buildApiUrl("users/"), {
      cache: "no-store",
      headers: getAuthHeaders(),
      signal,
    }),
  ]);

  const [tripData, requestsData, usersData] = await Promise.all([
    tripResponse.json().catch(() => null),
    requestsResponse.json().catch(() => null),
    usersResponse.json().catch(() => null),
  ]);

  if (!tripResponse.ok || !tripData?.success || !tripData?.data) {
    throw new Error(tripData?.message || t("Error loading schedule detail"));
  }

  if (!requestsResponse.ok || !requestsData?.success || !Array.isArray(requestsData?.data)) {
    throw new Error(requestsData?.message || t("Error loading schedule detail"));
  }

  if (!usersResponse.ok || !usersData?.success || !Array.isArray(usersData?.data)) {
    throw new Error(usersData?.message || t("Error loading schedule detail"));
  }

  const requesterLookup = mapUserLookup((usersData.data as any[]).map(mapApiUser));
  const trip = mapApiTrip(tripData.data);
  const expenseRequests = (requestsData.data as any[])
    .filter((request) => Number(request.id_trip ?? request.trip?.id_trip ?? 0) === tripId)
    .map(mapExpenseRequest);

  return {
    trip: {
      ...trip,
      expenseRequests,
    },
    requesterLookup,
  };
};

export const createExpenseVoucher = async (
  voucher: CreateExpenseVoucherInput,
  t: (key: string) => string,
  signal?: AbortSignal
) => {
  const sessionUser = getCurrentSessionUser();

  if (sessionUser.id === null) {
    throw new Error(
      t("Unable to identify the signed-in user to register this expense voucher.")
    );
  }

  const response = await fetch(buildApiUrl("expense-vouchers/"), {
    method: "POST",
    headers: getAuthHeaders(),
    signal,
    body: JSON.stringify({
      id_request: voucher.idRequest,
      expense_detail_id: voucher.expenseDetailId,
      document_type: voucher.documentType,
      supplier_ruc: voucher.supplierRuc.trim(),
      series_number: voucher.seriesNumber.trim(),
      voucher_number: voucher.voucherNumber.trim(),
      amount: voucher.amount.trim(),
      photo_url: voucher.photoUrl.trim(),
      rejection_reason: voucher.rejectionReason,
      status: voucher.status,
      created_by: sessionUser.id,
    }),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok || responseData?.success === false) {
    throw new Error(
      responseData?.message || t("Error registering expense voucher")
    );
  }

  return responseData;
};
