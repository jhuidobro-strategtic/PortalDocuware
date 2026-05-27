import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ScheduleTrip } from "../../shared/types";
import { formatAmount, formatDateTime, getTripBudgetTotal } from "../../shared/formatters";

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
      <div className="my-schedule-app__mobile-card-inline">
        <div className="my-schedule-app__mobile-card-avatar" aria-hidden="true">
          <i className="ri-road-map-line" />
        </div>

        <div className="my-schedule-app__mobile-card-copy">
          <strong className="my-schedule-app__mobile-card-trip-number">
            {trip.tripNumber || "-"}
          </strong>
          <span className="my-schedule-app__mobile-card-route">
            {trip.origin?.label || "-"} {"->"} {trip.destination?.label || "-"}
          </span>
          {/* <span className="my-schedule-app__mobile-card-departure">
            <i className="ri-calendar-event-line" aria-hidden="true" />
            {formatDateTime(trip.departureDate)}
          </span> */}
        </div>

        <div className={`my-schedule-app__mobile-budget my-schedule-app__mobile-budget--inline ${hasBudget ? "has-budget" : "is-empty"}`}>
          <span>{t("Total Budget")}</span>
          <strong>{budgetLabel}</strong>
        </div>
      </div>
    </motion.button>
  );
};
