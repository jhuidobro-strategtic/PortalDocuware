import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { MyScheduleDetailDesktopView } from "../desktop/MyScheduleDetailDesktopView";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { useMyScheduleDetailController } from "../hooks/useMyScheduleDetailController";
import { MyScheduleDetailMobileView } from "../mobile/MyScheduleDetailMobileView";
import "../styles/myScheduleApp.scss";

const MyScheduleDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const device = useDeviceMode();
  const parsedTripId = useMemo(
    () => (/^\d+$/.test(tripId || "") ? Number(tripId) : null),
    [tripId]
  );
  const controller = useMyScheduleDetailController(parsedTripId);

  useEffect(() => {
    document.title = `${t("My Schedule")} | Docuware`;
  }, [t]);

  const handleBack = () => {
    navigate("/travel-expenses/my-schedule");
  };

  return device.isMobile ? (
    <MyScheduleDetailMobileView
      clearFeedback={controller.clearFeedback}
      feedback={controller.feedback}
      getRequesterLabel={controller.getRequesterLabel}
      loadingDetail={controller.loadingDetail}
      onBack={handleBack}
      trip={controller.trip}
    />
  ) : (
    <MyScheduleDetailDesktopView
      clearFeedback={controller.clearFeedback}
      feedback={controller.feedback}
      getRequesterLabel={controller.getRequesterLabel}
      loadingDetail={controller.loadingDetail}
      onBack={handleBack}
      trip={controller.trip}
    />
  );
};

export default MyScheduleDetailPage;
