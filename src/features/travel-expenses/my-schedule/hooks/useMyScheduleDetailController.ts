import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FeedbackState, ScheduleTrip } from "../shared/types";
import { fetchScheduleDetail } from "../services/mySchedule.service";

export const useMyScheduleDetailController = (tripId: number | null) => {
  const { t } = useTranslation();
  const [trip, setTrip] = useState<ScheduleTrip | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [requesterLookup, setRequesterLookup] = useState<Record<number, string>>(
    {}
  );

  const loadDetail = useCallback(
    async (signal?: AbortSignal) => {
      try {
        if (tripId === null) {
          throw new Error(t("Error loading schedule detail"));
        }

        setLoadingDetail(true);
        setFeedback(null);

        const detail = await fetchScheduleDetail(tripId, t, signal);
        setTrip(detail.trip);
        setRequesterLookup(detail.requesterLookup);
      } catch (detailError: any) {
        if (signal?.aborted) {
          return;
        }

        setFeedback({
          type: "danger",
          message: detailError?.message || t("Error loading schedule detail"),
        });
      } finally {
        if (!signal?.aborted) {
          setLoadingDetail(false);
        }
      }
    },
    [tripId, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadDetail]);

  const getRequesterLabel = (requesterId: number) =>
    requesterLookup[requesterId] || `#${requesterId || "-"}`;

  return {
    clearFeedback: () => setFeedback(null),
    feedback,
    loadingDetail,
    trip,
    getRequesterLabel,
  };
};
