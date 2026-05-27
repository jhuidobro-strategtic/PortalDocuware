import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { MyScheduleDetailDesktopView } from "../desktop/MyScheduleDetailDesktopView";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { useMyScheduleDetailController } from "../hooks/useMyScheduleDetailController";
import { MyScheduleDetailMobileView } from "../mobile/MyScheduleDetailMobileView";
import { FeedbackState } from "../shared/types";
import "../styles/myScheduleApp.scss";

const MyScheduleDetailPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const device = useDeviceMode();
  const parsedTripId = useMemo(
    () => (/^\d+$/.test(tripId || "") ? Number(tripId) : null),
    [tripId]
  );
  const controller = useMyScheduleDetailController(parsedTripId);
  const { showFeedback } = controller;

  useEffect(() => {
    document.title = `${t("My Schedule")} | Docuware`;
  }, [t]);

  useEffect(() => {
    const state = location.state as { feedback?: FeedbackState } | null;

    if (!state?.feedback) {
      return;
    }

    showFeedback(state.feedback);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, showFeedback]);

  const handleBack = () => {
    navigate("/travel-expenses/my-schedule");
  };

  const handleOpenExpenseVoucher = (requestId: number, expenseDetailId: number) => {
    if (!parsedTripId) {
      return;
    }

    navigate(
      `/travel-expenses/my-schedule/${parsedTripId}/requests/${requestId}/details/${expenseDetailId}/voucher`
    );
  };

  return device.isMobile ? (
    <MyScheduleDetailMobileView
      clearFeedback={controller.clearFeedback}
      feedback={controller.feedback}
      loadingDetail={controller.loadingDetail}
      onBack={handleBack}
      onOpenExpenseVoucher={handleOpenExpenseVoucher}
      trip={controller.trip}
    />
  ) : (
    <MyScheduleDetailDesktopView
      clearFeedback={controller.clearFeedback}
      feedback={controller.feedback}
      getRequesterLabel={controller.getRequesterLabel}
      loadingDetail={controller.loadingDetail}
      onBack={handleBack}
      onOpenExpenseVoucher={handleOpenExpenseVoucher}
      trip={controller.trip}
    />
  );
};

export default MyScheduleDetailPage;
