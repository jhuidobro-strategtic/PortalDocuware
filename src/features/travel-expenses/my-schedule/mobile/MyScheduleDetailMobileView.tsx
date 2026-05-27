import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { formatAmount } from "../shared/formatters";
import { FeedbackState, ScheduleTrip, ScheduleExpenseRequest, ScheduleExpenseRequestDetail } from "../shared/types";
import { MobileSectionCard } from "./components/MobileSectionCard";

interface MyScheduleDetailMobileViewProps {
  clearFeedback: () => void;
  feedback: FeedbackState | null;
  loadingDetail: boolean;
  onBack: () => void;
  onOpenExpenseVoucherDocument: (photoUrl: string) => void;
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
  onOpenExpenseVoucherDocument,
  onOpenExpenseVoucher,
  trip,
}: MyScheduleDetailMobileViewProps) => {
  const { t } = useTranslation();
  const [selectedDetail, setSelectedDetail] = useState<{
    request: ScheduleExpenseRequest;
    detail: ScheduleExpenseRequestDetail;
  } | null>(null);
  const floatingAlerts: FloatingAlertItem[] = [];
  const getVoucherLabel = (seriesNumber: string, voucherNumber: string, fallbackIndex: number) =>
    [seriesNumber, voucherNumber].filter(Boolean).join("-") ||
    `${t("Attachment")} ${fallbackIndex + 1}`;

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
                              const hasRegisteredVouchers = detail.expenseVouchers.length > 0;
                              const totalVoucherAmount = detail.expenseVouchers.reduce(
                                (sum, voucher) => sum + parseFloat(voucher.amount || "0"),
                                0
                              );
                              const isOverBudget = totalVoucherAmount > parseFloat(detail.budgetedAmount || "0");

                              return (
                                <motion.article
                                  key={detail.expenseDetailId}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.18 }}
                                  whileTap={{ scale: 0.985 }}
                                  className="my-schedule-app__mobile-expense-card"
                                  onClick={() => setSelectedDetail({ request, detail })}
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
                                      <span>
                                        {hasRegisteredVouchers
                                          ? `${detail.expenseVouchers.length} ${t("Registered vouchers")}`
                                          : request.requestNumber}
                                      </span>
                                    </div>

                                    <div className="my-schedule-app__mobile-expense-amount">
                                      <strong>{formatAmount(detail.budgetedAmount)}</strong>
                                      {hasRegisteredVouchers && (
                                        <span className={`my-schedule-app__mobile-expense-spent ${isOverBudget ? "is-over" : "is-under"}`}>
                                          {formatAmount(String(totalVoucherAmount))}
                                        </span>
                                      )}
                                    </div>
                                  </div>
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

      <AnimatePresence>
        {selectedDetail && (() => {
          const { request, detail } = selectedDetail;
          const expenseMeta = getExpenseConceptMeta(detail.conceptLabel);
          const hasRegisteredVouchers = detail.expenseVouchers.length > 0;

          return (
            <>
              <motion.div
                className="my-schedule-app__sheet-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDetail(null)}
              />

              <motion.div
                className="my-schedule-app__sheet"
                initial={{ y: "100%", x: "-50%" }}
                animate={{ y: 0, x: "-50%" }}
                exit={{ y: "100%", x: "-50%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
              >
                <div className="my-schedule-app__sheet-handle" />

                <div className="my-schedule-app__sheet-header">
                  <div className="my-schedule-app__sheet-header-left">
                    <div className={`my-schedule-app__sheet-title-icon my-schedule-app__mobile-expense-icon--${expenseMeta.tone}`}>
                      <i className={expenseMeta.icon} />
                    </div>
                    <div className="my-schedule-app__sheet-title-info">
                      <strong>{detail.conceptLabel || "-"}</strong>
                      <span>{request.requestNumber}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="my-schedule-app__sheet-close"
                    onClick={() => setSelectedDetail(null)}
                  >
                    <i className="ri-close-line" />
                  </button>
                </div>

                <div className="my-schedule-app__sheet-body">
                  <div className="my-schedule-app__sheet-section">
                    <span className="my-schedule-app__sheet-section-title">{t("Expense details")}</span>
                    <div className="my-schedule-app__mobile-detail-row">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small">{t("Budgeted Amount")}</span>
                        <strong>{formatAmount(detail.budgetedAmount)}</strong>
                      </div>
                      {detail.notes && (
                        <div className="mt-2 border-top pt-2">
                          <span className="text-muted small d-block mb-1">{t("Notes")}</span>
                          <p className="text-body mb-0 small" style={{ whiteSpace: "pre-line" }}>
                            {detail.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-schedule-app__sheet-section">
                    <span className="my-schedule-app__sheet-section-title">{t("Select an action")}</span>
                    <button
                      type="button"
                      className="my-schedule-app__sheet-action-btn"
                      onClick={() => {
                        setSelectedDetail(null);
                        onOpenExpenseVoucher(request.idRequest, detail.expenseDetailId);
                      }}
                    >
                      <i className="ri-file-add-line" />
                      <div className="my-schedule-app__sheet-action-btn-copy">
                        <strong>{t("Register expense")}</strong>
                        <span>{t("Upload photo or enter receipt details")}</span>
                      </div>
                    </button>
                  </div>

                  <div className="my-schedule-app__sheet-section">
                    <span className="my-schedule-app__sheet-section-title">
                      {t("Registered vouchers")} ({detail.expenseVouchers.length})
                    </span>
                    {hasRegisteredVouchers ? (
                      <div className="my-schedule-app__sheet-voucher-list">
                        {detail.expenseVouchers.map((voucher, voucherIndex) => (
                          <button
                            key={voucher.expenseVoucherId || `${detail.expenseDetailId}-${voucherIndex}`}
                            type="button"
                            className="my-schedule-app__sheet-voucher-item"
                            onClick={() => {
                              setSelectedDetail(null);
                              onOpenExpenseVoucherDocument(voucher.photoUrl);
                            }}
                          >
                            <div className="my-schedule-app__sheet-voucher-left">
                              <div className="my-schedule-app__sheet-voucher-icon">
                                <i className="ri-file-text-line" />
                              </div>
                              <div className="my-schedule-app__sheet-voucher-copy">
                                <strong>
                                  {getVoucherLabel(voucher.seriesNumber, voucher.voucherNumber, voucherIndex)}
                                </strong>
                                <span>{voucher.documentTypeLabel || t("Voucher")}</span>
                              </div>
                            </div>
                            <div className="my-schedule-app__sheet-voucher-amount">
                              {formatAmount(voucher.amount)}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="my-schedule-app__mobile-empty my-schedule-app__mobile-empty--inline py-3 border rounded-3 border-dashed text-center">
                        <p className="text-muted small mb-0">{t("No registered vouchers.")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
