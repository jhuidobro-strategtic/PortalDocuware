import { buildApiUrl } from "../../../../helpers/api-url";
import { mapApiTrip, mapApiUser, mapExpenseRequest, mapUserLookup } from "../shared/mappers";
import { getAuthHeaders } from "../shared/session";
import { ScheduleTrip, SessionUser } from "../shared/types";

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

  const response = await fetch(buildApiUrl(tripsPath), {
    cache: "no-store",
    headers: getAuthHeaders(),
    signal,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
    throw new Error(data?.message || t("Error loading schedule"));
  }

  return (data.data as any[]).map(mapApiTrip);
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
