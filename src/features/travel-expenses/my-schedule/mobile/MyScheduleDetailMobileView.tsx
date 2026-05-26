import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { formatAmount } from "../shared/formatters";
import { FeedbackState, ScheduleTrip } from "../shared/types";
import { MobileSectionCard } from "./components/MobileSectionCard";
import { MobileStatusPill } from "./components/MobileStatusPill";

interface MyScheduleDetailMobileViewProps {
  clearFeedback: () => void;
  feedback: FeedbackState | null;
  getRequesterLabel: (requesterId: number) => string;
  loadingDetail: boolean;
  onBack: () => void;
  trip: ScheduleTrip | null;
}

export const MyScheduleDetailMobileView = ({
  clearFeedback,
  feedback,
  getRequesterLabel,
  loadingDetail,
  onBack,
  trip,
}: MyScheduleDetailMobileViewProps) => {
  const { t } = useTranslation();
  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "my-schedule-mobile-detail-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  return (
    <div className="page-content my-schedule-app">
      <FloatingAlerts alerts={floatingAlerts} onRemove={clearFeedback} />

      <section className="my-schedule-app__mobile-shell my-schedule-app__mobile-shell--detail">
        <header className="my-schedule-app__mobile-detail-hero">
          <button
            type="button"
            className="my-schedule-app__mobile-back"
            onClick={onBack}
          >
            <i className="ri-arrow-left-line" />
          </button>

          <div className="my-schedule-app__mobile-detail-copy">
            <p className="my-schedule-app__mobile-kicker">{t("Trip")}</p>
            <h1 className="my-schedule-app__mobile-headline">
              {trip?.tripNumber || t("Loading...")}
            </h1>
            <p className="my-schedule-app__mobile-subheadline">
              {trip
                ? `${trip.origin?.label || "-"} → ${trip.destination?.label || "-"}`
                : t("Travel Expenses")}
            </p>
          </div>

          {trip ? <MobileStatusPill status={trip.status} /> : null}
        </header>

        {loadingDetail ? (
          <div className="my-schedule-app__mobile-skeleton-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`detail-skeleton-${index}`}
                className="my-schedule-app__mobile-skeleton-card"
              />
            ))}
          </div>
        ) : trip ? (
          <div className="my-schedule-app__mobile-detail-stack">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <MobileSectionCard
                title={t("Expense Requests")}
                subtitle={`${trip.expenseRequests.length} ${t("Requests")}`}
              >
                {trip.expenseRequests.length === 0 ? (
                  <div className="my-schedule-app__mobile-empty my-schedule-app__mobile-empty--inline">
                    <h2>{t("No associated expense requests.")}</h2>
                  </div>
                ) : (
                  <div className="my-schedule-app__mobile-request-list">
                    {trip.expenseRequests.map((request) => (
                      <article
                        key={request.idRequest}
                        className="my-schedule-app__mobile-request-card"
                      >
                        <div className="my-schedule-app__mobile-request-total">
                          <span>{t("Total Budget")}</span>
                          <strong>{formatAmount(request.totalBudget)}</strong>
                        </div>

                        <div className="my-schedule-app__mobile-detail-rows">
                          {request.details.length === 0 ? (
                            <div className="my-schedule-app__mobile-detail-row">
                              <span>{t("No records found")}</span>
                            </div>
                          ) : (
                            request.details.map((detail) => (
                              <div
                                key={detail.expenseDetailId}
                                className="my-schedule-app__mobile-detail-row"
                              >
                                <div>
                                  <strong>{detail.conceptLabel || "-"}</strong>
                                </div>
                                <strong>{formatAmount(detail.budgetedAmount)}</strong>
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </MobileSectionCard>
            </motion.div>
          </div>
        ) : null}
      </section>
    </div>
  );
};
