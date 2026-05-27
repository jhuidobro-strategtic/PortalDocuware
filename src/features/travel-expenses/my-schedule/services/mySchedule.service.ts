import { buildApiUrl } from "../../../../helpers/api-url";
import {
  mapApiTrip,
  mapApiUser,
  mapExpenseRequest,
  mapExpenseVoucher,
  mapUserLookup,
} from "../shared/mappers";
import { getAuthHeaders, getCurrentSessionUser } from "../shared/session";
import {
  CreateExpenseVoucherResult,
  CreateExpenseVoucherInput,
  ScheduleExpenseRequest,
  ScheduleTrip,
  SessionUser,
} from "../shared/types";

const extractExpenseVoucherId = (value: any): number | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const directCandidates = [
    value.id,
    value.id_voucher,
    value.id_expense_voucher,
    value.expense_voucher_id,
    value.idExpenseVoucher,
    value.idExpenseVoucherPhoto,
  ];

  for (const candidate of directCandidates) {
    const parsedCandidate = Number(candidate);

    if (Number.isFinite(parsedCandidate) && parsedCandidate > 0) {
      return parsedCandidate;
    }
  }

  if ("data" in value) {
    const nestedId = extractExpenseVoucherId(value.data);

    if (nestedId !== null) {
      return nestedId;
    }
  }

  return null;
};

const extractExpenseVoucherIdFromLocation = (locationHeader: string | null) => {
  if (!locationHeader) {
    return null;
  }

  const matchedId = locationHeader.match(/\/(\d+)\/?$/);
  const parsedId = Number(matchedId?.[1] ?? "");

  return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;
};

const enrichExpenseRequestsWithVouchers = async (
  expenseRequests: ScheduleExpenseRequest[],
  signal?: AbortSignal
) => {
  const voucherRequests = expenseRequests.flatMap((request) =>
    request.details.map((detail) => ({
      expenseDetailId: detail.expenseDetailId,
      idRequest: request.idRequest,
    }))
  );

  if (voucherRequests.length === 0) {
    return expenseRequests;
  }

  const voucherResponses = await Promise.all(
    voucherRequests.map(async ({ idRequest, expenseDetailId }) => {
      let vouchers: ReturnType<typeof mapExpenseVoucher>[] = [];

      try {
        const response = await fetch(
          buildApiUrl(
            `expense-vouchers/?id_request=${encodeURIComponent(
              String(idRequest)
            )}&expense_detail_id=${encodeURIComponent(String(expenseDetailId))}`
          ),
          {
            cache: "no-store",
            headers: getAuthHeaders(),
            signal,
          }
        );
        const responseData = await response.json().catch(() => null);
        vouchers =
          response.ok &&
          responseData?.success &&
          Array.isArray(responseData?.data)
            ? responseData.data.map(mapExpenseVoucher)
            : [];
      } catch {
        vouchers = [];
      }

      return {
        expenseDetailId,
        idRequest,
        vouchers,
      };
    })
  );

  const voucherLookup = voucherResponses.reduce<Record<string, ReturnType<typeof mapExpenseVoucher>[]>>(
    (acc, item) => {
      acc[`${item.idRequest}:${item.expenseDetailId}`] = item.vouchers;
      return acc;
    },
    {}
  );

  return expenseRequests.map((request) => ({
    ...request,
    details: request.details.map((detail) => ({
      ...detail,
      expenseVouchers:
        voucherLookup[`${request.idRequest}:${detail.expenseDetailId}`] ?? [],
    })),
  }));
};

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

  const trips = (tripsData.data as any[]).map((item) => {
    const trip = mapApiTrip(item);

    return {
      ...trip,
      expenseRequests:
        requestsByTripId[trip.idTrip] ??
        trip.expenseRequests,
    };
  });

  const enrichedTrips = await Promise.all(
    trips.map(async (trip) => ({
      ...trip,
      expenseRequests: await enrichExpenseRequestsWithVouchers(
        trip.expenseRequests,
        signal
      ),
    }))
  );

  return enrichedTrips;
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
  const enrichedExpenseRequests = await enrichExpenseRequestsWithVouchers(
    expenseRequests,
    signal
  );

  return {
    trip: {
      ...trip,
      expenseRequests: enrichedExpenseRequests,
    },
    requesterLookup,
  };
};

export const createExpenseVoucher = async (
  voucher: CreateExpenseVoucherInput,
  t: (key: string) => string,
  signal?: AbortSignal
): Promise<CreateExpenseVoucherResult> => {
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

  const createdVoucherId =
    extractExpenseVoucherId(responseData) ||
    extractExpenseVoucherIdFromLocation(response.headers.get("Location"));

  if (createdVoucherId === null) {
    throw new Error(t("Unable to identify the generated expense voucher ID."));
  }

  return {
    id: createdVoucherId,
    responseData,
  };
};

export const uploadExpenseVoucherPhoto = async (
  voucherId: number,
  photoFile: File,
  t: (key: string) => string,
  signal?: AbortSignal
) => {
  const sessionUser = getCurrentSessionUser();

  if (sessionUser.id === null) {
    throw new Error(
      t("Unable to identify the signed-in user to upload the voucher photo.")
    );
  }

  const formData = new FormData();
  formData.append("photo", photoFile);
  formData.append("updated_by", String(sessionUser.id));

  const authHeaders = getAuthHeaders();
  const { ["Content-Type"]: _ignoredContentType, ...uploadHeaders } = authHeaders;

  const response = await fetch(
    buildApiUrl(`expense-vouchers/${voucherId}/photo/`),
    {
      method: "POST",
      headers: uploadHeaders,
      body: formData,
      signal,
    }
  );

  const responseData = await response.json().catch(() => null);

  if (!response.ok || responseData?.success === false) {
    throw new Error(
      responseData?.message || t("Error uploading expense voucher photo")
    );
  }

  return responseData;
};
