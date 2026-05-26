import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { MyScheduleDesktopView } from "../desktop/MyScheduleDesktopView";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { useMyScheduleListController } from "../hooks/useMyScheduleListController";
import { MyScheduleMobileView } from "../mobile/MyScheduleMobileView";
import "../styles/myScheduleApp.scss";

const MySchedulePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const device = useDeviceMode();
  const controller = useMyScheduleListController();

  useEffect(() => {
    document.title = `${t("My Schedule")} | Docuware`;
  }, [t]);

  const handleOpenTripDetail = (tripId: number) => {
    navigate(`/travel-expenses/my-schedule/${tripId}`);
  };

  return device.isMobile ? (
    <MyScheduleMobileView
      clearFeedback={controller.clearFeedback}
      feedback={controller.feedback}
      filteredTrips={controller.filteredTrips}
      isAdminProfile={controller.isAdminProfile}
      loadingTrips={controller.loadingTrips}
      onOpenTripDetail={handleOpenTripDetail}
      onSearchTermChange={controller.setSearchTerm}
      searchTerm={controller.searchTerm}
      summary={controller.summary}
    />
  ) : (
    <MyScheduleDesktopView
      clearFeedback={controller.clearFeedback}
      currentPage={controller.currentPage}
      feedback={controller.feedback}
      filteredTrips={controller.filteredTrips}
      isAdminProfile={controller.isAdminProfile}
      loadingTrips={controller.loadingTrips}
      onOpenTripDetail={handleOpenTripDetail}
      onPageChange={controller.setCurrentPage}
      onSearchTermChange={controller.setSearchTerm}
      paginatedTrips={controller.paginatedTrips}
      searchTerm={controller.searchTerm}
      summary={controller.summary}
      totalPages={controller.totalPages}
    />
  );
};

export default MySchedulePage;
