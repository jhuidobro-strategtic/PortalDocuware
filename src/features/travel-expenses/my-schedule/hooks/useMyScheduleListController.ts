import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MY_SCHEDULE_ITEMS_PER_PAGE } from "../shared/constants";
import { buildScheduleSummary, matchesSearchValue } from "../shared/formatters";
import { getCurrentSessionUser } from "../shared/session";
import { FeedbackState, ScheduleTrip } from "../shared/types";
import { fetchScheduleTrips } from "../services/mySchedule.service";

export const useMyScheduleListController = () => {
  const { t } = useTranslation();
  const sessionUser = useMemo(() => getCurrentSessionUser(), []);
  const [trips, setTrips] = useState<ScheduleTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const isAdminProfile =
    sessionUser.profileId === 1 || sessionUser.profileId === 2;

  const loadTrips = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoadingTrips(true);
        setFeedback(null);

        const nextTrips = await fetchScheduleTrips(sessionUser, t, signal);
        setTrips(nextTrips);
      } catch (fetchError: any) {
        if (signal?.aborted) {
          return;
        }

        setFeedback({
          type: "danger",
          message: fetchError?.message || t("Error loading schedule"),
        });
      } finally {
        if (!signal?.aborted) {
          setLoadingTrips(false);
        }
      }
    },
    [sessionUser, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTrips(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadTrips]);

  const filteredTrips = useMemo(() => {
    const normalizedTerm = deferredSearchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return trips;
    }

    return trips.filter((trip) => matchesSearchValue(trip, normalizedTerm));
  }, [deferredSearchTerm, trips]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrips.length / MY_SCHEDULE_ITEMS_PER_PAGE)
  );

  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * MY_SCHEDULE_ITEMS_PER_PAGE,
    currentPage * MY_SCHEDULE_ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summary = useMemo(() => buildScheduleSummary(trips), [trips]);

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return {
    clearFeedback: () => setFeedback(null),
    feedback,
    loadingTrips,
    isAdminProfile,
    summary,
    searchTerm,
    setSearchTerm: handleSearchTermChange,
    currentPage,
    setCurrentPage,
    totalPages,
    filteredTrips,
    paginatedTrips,
  };
};
