import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CreateExpenseVoucherInput,
  FeedbackState,
  ScheduleTrip,
} from "../shared/types";
import {
  createExpenseVoucher,
  fetchScheduleDetail,
} from "../services/mySchedule.service";

export const useMyScheduleDetailController = (tripId: number | null) => {
  const { t } = useTranslation();
  const [trip, setTrip] = useState<ScheduleTrip | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
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

  const submitExpenseVoucher = useCallback(
    async (payload: CreateExpenseVoucherInput) => {
      try {
        setSubmittingVoucher(true);
        setFeedback(null);

        await createExpenseVoucher(payload, t);
        await loadDetail();

        setFeedback({
          type: "success",
          message: t("Expense voucher registered successfully."),
        });

        return true;
      } catch (voucherError: any) {
        setFeedback({
          type: "danger",
          message:
            voucherError?.message || t("Error registering expense voucher"),
        });

        return false;
      } finally {
        setSubmittingVoucher(false);
      }
    },
    [loadDetail, t]
  );

  return {
    clearFeedback: () => setFeedback(null),
    feedback,
    loadingDetail,
    trip,
    getRequesterLabel,
    showFeedback: (nextFeedback: FeedbackState | null) => setFeedback(nextFeedback),
    submittingVoucher,
    submitExpenseVoucher,
  };
};
