import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { formatAmount } from "../shared/formatters";
import { FeedbackState, ScheduleTrip } from "../shared/types";
import { MobileSectionCard } from "./components/MobileSectionCard";

interface MyScheduleDetailMobileViewProps {
  clearFeedback: () => void;
  feedback: FeedbackState | null;
  loadingDetail: boolean;
  onBack: () => void;
  onOpenExpenseVoucher: (requestId: number, expenseDetailId: number) => void;
  trip: ScheduleTrip | null;
}

type ExpenseTone = "fuel" | "food" | "lodging" | "road" | "general";

const getExpenseConceptMeta = (conceptLabel: string): { icon: string; tone: ExpenseTone } => {
  const normalized = conceptLabel.trim().toLowerCase();

  if (
    normalized.includes("combust") ||
    normalized.includes("gasolina") ||
    normalized.includes("gas") ||
    normalized.includes("fuel")
  ) {
    return { icon: "ri-gas-station-line", tone: "fuel" };
  }

  if (
    normalized.includes("aliment") ||
    normalized.includes("food") ||
    normalized.includes("comida") ||
    normalized.includes("viatico")
  ) {
    return { icon: "ri-restaurant-2-line", tone: "food" };
  }

  if (
    normalized.includes("hosped") ||
    normalized.includes("hotel") ||
    normalized.includes("lodg")
  ) {
    return { icon: "ri-hotel-bed-line", tone: "lodging" };
  }

  if (
    normalized.includes("peaje") ||
    normalized.includes("parking") ||
    normalized.includes("ruta") ||
    normalized.includes("road") ||
    normalized.includes("toll")
  ) {
    return { icon: "ri-road-map-line", tone: "road" };
  }

  return { icon: "ri-wallet-3-line", tone: "general" };
};

export const MyScheduleDetailMobileView = ({
  clearFeedback,
  feedback,
  loadingDetail,
  onBack,
  onOpenExpenseVoucher,
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
          </div>
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

                        <div className="my-schedule-app__mobile-expense-list">
                          {request.details.length === 0 ? (
                            <div className="my-schedule-app__mobile-detail-row">
                              <span>{t("No records found")}</span>
                            </div>
                          ) : (
                            request.details.map((detail) => {
                              const expenseMeta = getExpenseConceptMeta(detail.conceptLabel);

                              return (
                                <motion.article
                                  key={detail.expenseDetailId}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="my-schedule-app__mobile-expense-card"
                                >
                                  <div className="my-schedule-app__mobile-expense-card-head">
                                    <div
                                      className={`my-schedule-app__mobile-expense-icon my-schedule-app__mobile-expense-icon--${expenseMeta.tone}`}
                                      aria-hidden="true"
                                    >
                                      <i className={expenseMeta.icon} />
                                    </div>

                                    <div className="my-schedule-app__mobile-expense-copy">
                                      <strong>{detail.conceptLabel || "-"}</strong>
                                      <span>{request.requestNumber}</span>
                                    </div>

                                    <div className="my-schedule-app__mobile-expense-amount">
                                      <strong>{formatAmount(detail.budgetedAmount)}</strong>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="my-schedule-app__mobile-expense-action"
                                    onClick={() =>
                                      onOpenExpenseVoucher(
                                        request.idRequest,
                                        detail.expenseDetailId
                                      )
                                    }
                                  >
                                    {t("Register expense")}
                                  </button>
                                </motion.article>
                              );
                            })
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
