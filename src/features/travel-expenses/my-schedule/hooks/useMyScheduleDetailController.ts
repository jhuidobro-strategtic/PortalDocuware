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
  uploadExpenseVoucherPhoto,
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
    async (
      payload: CreateExpenseVoucherInput,
      photoFile?: File | null
    ) => {
      try {
        setSubmittingVoucher(true);
        setFeedback(null);

        const createdVoucher = await createExpenseVoucher(payload, t);

        if (photoFile) {
          try {
            await uploadExpenseVoucherPhoto(createdVoucher.id, photoFile, t);
          } catch (photoUploadError: any) {
            await loadDetail();
            setFeedback({
              type: "danger",
              message:
                photoUploadError?.message ||
                t(
                  "The expense voucher was created, but the photo could not be uploaded."
                ),
            });

            return {
              success: false,
              created: true,
              uploadedPhoto: false,
            };
          }
        }

        await loadDetail();

        setFeedback({
          type: "success",
          message: t("Expense voucher registered successfully."),
        });

        return {
          success: true,
          created: true,
          uploadedPhoto: true,
        };
      } catch (voucherError: any) {
        setFeedback({
          type: "danger",
          message:
            voucherError?.message || t("Error registering expense voucher"),
        });

        return {
          success: false,
          created: false,
          uploadedPhoto: false,
        };
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
