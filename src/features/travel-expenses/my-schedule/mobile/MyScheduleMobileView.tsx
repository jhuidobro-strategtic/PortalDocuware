import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { formatDateTime } from "../shared/formatters";
import { FeedbackState, ScheduleSummary, ScheduleTrip } from "../shared/types";
import { MobileScheduleCard } from "./components/MobileScheduleCard";

interface MyScheduleMobileViewProps {
  clearFeedback: () => void;
  feedback: FeedbackState | null;
  filteredTrips: ScheduleTrip[];
  isAdminProfile: boolean;
  loadingTrips: boolean;
  onOpenTripDetail: (tripId: number) => void;
  onSearchTermChange: (value: string) => void;
  searchTerm: string;
  summary: ScheduleSummary;
}

export const MyScheduleMobileView = ({
  clearFeedback,
  feedback,
  filteredTrips,
  isAdminProfile,
  loadingTrips,
  onOpenTripDetail,
  onSearchTermChange,
  searchTerm,
  summary,
}: MyScheduleMobileViewProps) => {
  const { t } = useTranslation();
  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "my-schedule-mobile-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  return (
    <div className="page-content my-schedule-app">
      <FloatingAlerts alerts={floatingAlerts} onRemove={clearFeedback} />

      <section className="my-schedule-app__mobile-shell">
        <header className="my-schedule-app__mobile-hero">
          <div className="my-schedule-app__mobile-hero-copy">
            <p className="my-schedule-app__mobile-kicker">{t("Travel Expenses")}</p>
            <h1 className="my-schedule-app__mobile-headline">{t("My Schedule")}</h1>
          </div>

          <div className="my-schedule-app__mobile-search-wrap">
            <i className="ri-search-line" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder={t("Search trips...")}
              className="my-schedule-app__mobile-search"
            />
          </div>
        </header>

        <section className="my-schedule-app__mobile-list">
          {loadingTrips ? (
            <div className="my-schedule-app__mobile-skeleton-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`schedule-skeleton-${index}`}
                  className="my-schedule-app__mobile-skeleton-card"
                />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="my-schedule-app__mobile-empty">
              <div className="my-schedule-app__mobile-empty-icon">
                <i className="ri-road-map-line" />
              </div>
              <h2>{t("No trips were found.")}</h2>
              <p>{t("Search trips...")}</p>
            </div>
          ) : (
            filteredTrips.map((trip, index) => (
              <MobileScheduleCard
                key={trip.idTrip}
                index={index}
                trip={trip}
                onViewTrip={onOpenTripDetail}
              />
            ))
          )}
        </section>
      </section>
    </div>
  );
};
