import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ScheduleTrip } from "../../shared/types";
import { formatAmount, formatDateTime, getTripBudgetTotal } from "../../shared/formatters";
import { MobileStatusPill } from "./MobileStatusPill";

interface MobileScheduleCardProps {
  trip: ScheduleTrip;
  index: number;
  onViewTrip: (tripId: number) => void;
}

export const MobileScheduleCard = ({
  trip,
  index,
  onViewTrip,
}: MobileScheduleCardProps) => {
  const { t } = useTranslation();
  const totalBudget = getTripBudgetTotal(trip);
  const hasBudget = trip.expenseRequests.length > 0;
  const budgetLabel =
    hasBudget ? formatAmount(String(totalBudget)) : "-";

  return (
    <motion.button
      type="button"
      className={`my-schedule-app__mobile-card my-schedule-app__mobile-card--${trip.status ? "active" : "inactive"}`}
      onClick={() => onViewTrip(trip.idTrip)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="my-schedule-app__mobile-card-top">
        <div className="my-schedule-app__mobile-trip-chip">
          <span className="my-schedule-app__mobile-trip-chip-label">{t("Trip")}</span>
          <p className="my-schedule-app__mobile-trip-chip-value">{trip.tripNumber || "-"}</p>
        </div>
        <MobileStatusPill status={trip.status} />
      </div>

      <div className="my-schedule-app__mobile-route-panel">
        <div className="my-schedule-app__mobile-route-stop">
          <span>{t("Origin")}</span>
          <strong>{trip.origin?.label || "-"}</strong>
        </div>
        <div className="my-schedule-app__mobile-route-connector" aria-hidden="true">
          <span />
        </div>
        <div className="my-schedule-app__mobile-route-stop">
          <span>{t("Destination")}</span>
          <strong>{trip.destination?.label || "-"}</strong>
        </div>
      </div>

      <div className="my-schedule-app__mobile-card-meta-row">
        <i className="ri-calendar-event-line" aria-hidden="true" />
        <span>{t("Departure Date")}</span>
        <strong>{formatDateTime(trip.departureDate)}</strong>
      </div>

      <div className="my-schedule-app__mobile-card-footer">
        <div className={`my-schedule-app__mobile-budget ${hasBudget ? "has-budget" : "is-empty"}`}>
          <span>{t("Total Budget")}</span>
          <strong>{budgetLabel}</strong>
        </div>
      </div>
    </motion.button>
  );
};
