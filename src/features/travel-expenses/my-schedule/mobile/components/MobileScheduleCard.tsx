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
  const budgetLabel =
    trip.expenseRequests.length > 0 ? formatAmount(String(totalBudget)) : "-";

  return (
    <motion.article
      className="my-schedule-app__mobile-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="my-schedule-app__mobile-card-top">
        <div>
          <p className="my-schedule-app__mobile-eyebrow">{trip.tripNumber || "-"}</p>
        </div>
        <MobileStatusPill status={trip.status} />
      </div>

      <div className="my-schedule-app__mobile-card-content">
        <h3 className="my-schedule-app__mobile-card-title">
          {trip.origin?.label || "-"} <span>&rarr;</span> {trip.destination?.label || "-"}
        </h3>

        <p className="my-schedule-app__mobile-card-meta">
          {t("Departure Date")}: {formatDateTime(trip.departureDate)}
        </p>
      </div>

      <div className="my-schedule-app__mobile-budget">
        <span>{t("Total Budget")}</span>
        <strong>{budgetLabel}</strong>
      </div>

      <button
        type="button"
        className="my-schedule-app__mobile-primary-button"
        onClick={() => onViewTrip(trip.idTrip)}
      >
        <span>{t("View")}</span>
        <i className="ri-arrow-right-line" />
      </button>
    </motion.article>
  );
};
