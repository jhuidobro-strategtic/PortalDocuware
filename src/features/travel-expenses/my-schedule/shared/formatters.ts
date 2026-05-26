import moment from "moment";
import { ScheduleSummary, ScheduleTrip, StatusMeta } from "./types";

export const formatDateTime = (value: string) => {
  const parsedDate = moment(value, moment.ISO_8601, true);
  return parsedDate.isValid() ? parsedDate.format("DD/MM/YYYY HH:mm") : "-";
};

export const formatAmount = (value: string) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return value || "-";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(parsedValue);
};

export const matchesSearchValue = (value: unknown, term: string): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => matchesSearchValue(item, term));
  }

  if (typeof value === "object") {
    return Object.values(value).some((item) => matchesSearchValue(item, term));
  }

  const normalizedValue = String(value).toLowerCase();
  if (normalizedValue.includes(term)) {
    return true;
  }

  if (typeof value === "string") {
    const parsedDate = moment(value, moment.ISO_8601, true);
    if (parsedDate.isValid()) {
      return parsedDate.format("DD/MM/YYYY HH:mm").toLowerCase().includes(term);
    }
  }

  return false;
};

export const getStatusMeta = (
  status: boolean,
  t: (key: string) => string
): StatusMeta =>
  status
    ? {
        label: t("Active"),
        className:
          "badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-checkbox-circle-line",
        tone: "success",
      }
    : {
        label: t("Inactive"),
        className:
          "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-close-circle-line",
        tone: "danger",
      };

export const buildScheduleSummary = (items: ScheduleTrip[]): ScheduleSummary => {
  const activeTrips = items.filter((trip) => trip.status).length;
  const inactiveTrips = items.length - activeTrips;
  const nextTrip =
    [...items]
      .filter((trip) => moment(trip.departureDate, moment.ISO_8601, true).isValid())
      .sort((left, right) =>
        moment(left.departureDate).valueOf() - moment(right.departureDate).valueOf()
      )[0] ?? null;

  return {
    totalTrips: items.length,
    activeTrips,
    inactiveTrips,
    nextTrip,
  };
};
