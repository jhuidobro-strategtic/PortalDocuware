import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ScheduleTrip } from "../../shared/types";
import { formatDateTime } from "../../shared/formatters";
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
          <h3 className="my-schedule-app__mobile-card-title">
            {trip.origin?.label || "-"} <span>&rarr;</span> {trip.destination?.label || "-"}
          </h3>
        </div>
        <MobileStatusPill status={trip.status} />
      </div>

      <div className="my-schedule-app__mobile-card-grid">
        <div className="my-schedule-app__mobile-metric">
          <span>{t("Departure Date")}</span>
          <strong>{formatDateTime(trip.departureDate)}</strong>
        </div>
        <div className="my-schedule-app__mobile-metric">
          <span>{t("Return Date")}</span>
          <strong>{formatDateTime(trip.returnDate)}</strong>
        </div>
        <div className="my-schedule-app__mobile-metric">
          <span>{t("Vehicle")}</span>
          <strong>{trip.vehicle?.label || "-"}</strong>
        </div>
        <div className="my-schedule-app__mobile-metric">
          <span>{t("Driver")}</span>
          <strong>{trip.driver?.label || "-"}</strong>
        </div>
      </div>

      {trip.notes ? (
        <p className="my-schedule-app__mobile-card-notes">{trip.notes}</p>
      ) : null}

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
