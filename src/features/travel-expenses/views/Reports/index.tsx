import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Row,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { buildApiUrl } from "../../../../helpers/api-url";

interface ExpenseConceptReference {
  id: number;
  label: string;
}

interface ExpenseRequestDetail {
  expenseDetailId: number;
  concept: ExpenseConceptReference | null;
  budgetedAmount: string;
}

interface ExpenseRequestItem {
  idRequest: number;
  requestNumber: string;
  reason: string;
  totalBudget: string;
  status: boolean;
  details: ExpenseRequestDetail[];
}

interface ConceptSummary {
  conceptId: number | string;
  conceptLabel: string;
  detailed: number;
  active: number;
  inactive: number;
  share: number;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

interface ReportSummary {
  requestedBudget: number;
  detailedBudget: number;
  activeBudget: number;
  inactiveBudget: number;
  difference: number;
  conceptSummaries: ConceptSummary[];
}

interface ChartTooltipState {
  summary: ConceptSummary;
  left: number;
}

const CHART_BAR_COLORS = {
  detailed: "#3b82f6",
  active: "#22c55e",
  inactive: "#f97316",
} as const;

const getAuthHeaders = (): Record<string, string> => {
  try {
    const authUser = sessionStorage.getItem("authUser");
    const parsedUser = authUser ? JSON.parse(authUser) : null;
    const token = parsedUser?.token || parsedUser?.data?.token;

    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  } catch {
    return { "Content-Type": "application/json" };
  }
};

const parseAmount = (value: string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);

const truncateLabel = (value: string, maxLength = 14) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const mapExpenseConceptReference = (
  item: any
): ExpenseConceptReference | null => {
  if (!item) {
    return null;
  }

  const id = Number(item.id_concept ?? 0);
  const label = String(item.nombre_concepto ?? "").trim();

  if (!id && !label) {
    return null;
  }

  return { id, label };
};

const mapExpenseRequestDetail = (item: any): ExpenseRequestDetail => ({
  expenseDetailId: Number(item.expense_detail_id ?? 0),
  concept: mapExpenseConceptReference(item.concept),
  budgetedAmount: String(item.budgeted_amount ?? "").trim(),
});

const mapExpenseRequest = (item: any): ExpenseRequestItem => ({
  idRequest: Number(item.id_request ?? 0),
  requestNumber: String(item.request_number ?? "").trim(),
  reason: String(item.reason ?? "").trim(),
  totalBudget: String(item.total_budget ?? "").trim(),
  status: Boolean(item.status),
  details: Array.isArray(item.details)
    ? item.details.map(mapExpenseRequestDetail)
    : [],
});

const buildReportSummary = (requests: ExpenseRequestItem[]): ReportSummary => {
  const conceptSummaryMap = new Map<string, Omit<ConceptSummary, "share">>();

  const requestedBudget = requests.reduce(
    (acc, request) => acc + parseAmount(request.totalBudget),
    0
  );

  let detailedBudget = 0;
  let activeBudget = 0;
  let inactiveBudget = 0;

  requests.forEach((request) => {
    request.details.forEach((detail) => {
      const amount = parseAmount(detail.budgetedAmount);
      const conceptKey = String(
        detail.concept?.id || `detail-${detail.expenseDetailId}`
      );
      const currentSummary = conceptSummaryMap.get(conceptKey) || {
        conceptId: detail.concept?.id || conceptKey,
        conceptLabel: detail.concept?.label || "Sin concepto",
        detailed: 0,
        active: 0,
        inactive: 0,
      };

      currentSummary.detailed += amount;

      if (request.status) {
        currentSummary.active += amount;
        activeBudget += amount;
      } else {
        currentSummary.inactive += amount;
        inactiveBudget += amount;
      }

      detailedBudget += amount;
      conceptSummaryMap.set(conceptKey, currentSummary);
    });
  });

  const conceptSummaries = Array.from(conceptSummaryMap.values())
    .map((summary) => ({
      ...summary,
      share: detailedBudget > 0 ? (summary.detailed / detailedBudget) * 100 : 0,
    }))
    .sort((left, right) => right.detailed - left.detailed);

  return {
    requestedBudget,
    detailedBudget,
    activeBudget,
    inactiveBudget,
    difference: requestedBudget - detailedBudget,
    conceptSummaries,
  };
};

const ReportMetricCard: React.FC<{
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "neutral";
  subtitle?: string;
}> = ({ label, value, tone = "neutral", subtitle }) => {
  const toneClassName =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "warning"
          ? "text-warning"
          : "text-dark";

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardBody className="p-4 text-center">
        <div className="text-muted mb-2">{label}</div>
        <div className={`fw-semibold fs-2 ${toneClassName}`}>{value}</div>
        {subtitle && <div className="text-muted small mt-2">{subtitle}</div>}
      </CardBody>
    </Card>
  );
};

const AnimatedChartBar: React.FC<{
  value: number;
  color: string;
  heightPercent: number;
  delay: number;
}> = ({ value, color, heightPercent, delay }) => (
  <motion.div
    className="rounded-top"
    initial={{
      height: 0,
      opacity: 0.4,
      y: 14,
      boxShadow: "0 0 0 rgba(0,0,0,0)",
    }}
    animate={{
      height: `${heightPercent}%`,
      opacity: 1,
      y: 0,
      boxShadow: `0 10px 24px ${color}33`,
    }}
    whileHover={{
      y: -6,
      scale: 1.04,
      boxShadow: `0 16px 34px ${color}55`,
      filter: "brightness(1.08)",
    }}
    transition={{
      type: "spring",
      stiffness: 110,
      damping: 16,
      mass: 0.7,
      delay,
    }}
    style={{
      width: "18px",
      minHeight: value > 0 ? "6px" : 0,
      background: `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)`,
      transformOrigin: "bottom center",
      willChange: "height, transform",
    }}
  />
);

const ReportsPage = () => {
  const { t } = useTranslation();
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const [requests, setRequests] = useState<ExpenseRequestItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedRequestFilter, setSelectedRequestFilter] = useState("all");
  const [chartTooltip, setChartTooltip] = useState<ChartTooltipState | null>(
    null
  );

  const fetchExpenseRequests = useCallback(async () => {
    try {
      setLoadingReports(true);
      setFeedback(null);

      const response = await fetch(buildApiUrl("expense-requests/"), {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
        throw new Error(data?.message || t("Error loading expense requests"));
      }

      setRequests((data.data as any[]).map(mapExpenseRequest));
    } catch (fetchError: any) {
      setFeedback({
        type: "danger",
        message: fetchError?.message || t("Error loading expense requests"),
      });
    } finally {
      setLoadingReports(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("Reports")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchExpenseRequests();
  }, [fetchExpenseRequests]);

  useEffect(() => {
    setChartTooltip(null);
  }, [selectedRequestFilter]);

  const filteredRequests = useMemo(() => {
    if (selectedRequestFilter === "all") {
      return requests;
    }

    return requests.filter(
      (request) => String(request.idRequest) === selectedRequestFilter
    );
  }, [requests, selectedRequestFilter]);

  const reportSummary = useMemo(
    () => buildReportSummary(filteredRequests),
    [filteredRequests]
  );

  const maxChartValue = useMemo(() => {
    const values = reportSummary.conceptSummaries.flatMap((summary) => [
      summary.detailed,
      summary.active,
      summary.inactive,
    ]);
    return Math.max(...values, 0);
  }, [reportSummary.conceptSummaries]);

  const differenceMeta = useMemo(() => {
    if (reportSummary.difference > 0) {
      return {
        tone: "success" as const,
        subtitle: t("Leftover"),
      };
    }

    if (reportSummary.difference < 0) {
      return {
        tone: "warning" as const,
        subtitle: t("Over budget"),
      };
    }

    return {
      tone: "neutral" as const,
      subtitle: t("Balanced"),
    };
  }, [reportSummary.difference, t]);

  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "expense-reports-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "expense-reports-feedback") {
      setFeedback(null);
    }
  };

  const handleChartTooltipMove = (
    summary: ConceptSummary,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!chartWrapperRef.current) {
      return;
    }

    const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();
    const nextLeft = targetRect.left - wrapperRect.left + targetRect.width / 2;
    const clampedLeft = Math.min(
      Math.max(nextLeft, 120),
      Math.max(wrapperRect.width - 120, 120)
    );

    setChartTooltip({
      summary,
      left: clampedLeft,
    });
  };

  const handleChartTooltipLeave = () => {
    setChartTooltip(null);
  };

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />

        <BreadCrumb title="Reports" pageTitle="Travel Expenses" />

        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <h4 className="mb-1">{t("Reports")}</h4>
            <p className="text-muted mb-0">
              {t("Budget summary based on expense requests and detail lines.")}
            </p>
          </div>

          <div style={{ width: "320px", maxWidth: "100%" }}>
            <Input
              type="select"
              value={selectedRequestFilter}
              onChange={(event) => setSelectedRequestFilter(event.target.value)}
            >
              <option value="all">{t("All requests")}</option>
              {requests.map((request) => (
                <option key={request.idRequest} value={String(request.idRequest)}>
                  {request.requestNumber || `#${request.idRequest}`}
                </option>
              ))}
            </Input>
          </div>
        </div>

        {loadingReports ? (
          <Card className="border-0 shadow-sm">
            <CardBody className="py-5 text-center">
              <Spinner color="primary" />
            </CardBody>
          </Card>
        ) : (
          <>
            <Row className="g-3 mb-4">
              <Col xl={2} lg={4} md={6}>
                <ReportMetricCard
                  label={t("Requested Budget")}
                  value={formatCurrency(reportSummary.requestedBudget)}
                  tone="neutral"
                />
              </Col>
              <Col xl={2} lg={4} md={6}>
                <ReportMetricCard
                  label={t("Detailed")}
                  value={formatCurrency(reportSummary.detailedBudget)}
                  tone="primary"
                />
              </Col>
              <Col xl={2} lg={4} md={6}>
                <ReportMetricCard
                  label={t("Active")}
                  value={formatCurrency(reportSummary.activeBudget)}
                  tone="success"
                />
              </Col>
              <Col xl={2} lg={4} md={6}>
                <ReportMetricCard
                  label={t("Inactive")}
                  value={formatCurrency(reportSummary.inactiveBudget)}
                  tone="warning"
                />
              </Col>
              <Col xl={4} lg={8} md={12}>
                <ReportMetricCard
                  label={t("Difference")}
                  value={formatCurrency(reportSummary.difference)}
                  tone={differenceMeta.tone}
                  subtitle={differenceMeta.subtitle}
                />
              </Col>
            </Row>

            <Card className="border-0 shadow-sm mb-4">
              <CardBody className="p-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="ri-bar-chart-box-line text-primary fs-5" />
                  <h5 className="mb-0">{t("Budget vs Detail by Concept")}</h5>
                </div>

                {reportSummary.conceptSummaries.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    {t("No concept data available for the selected filter.")}
                  </div>
                ) : (
                  <div ref={chartWrapperRef} className="position-relative pt-5">
                    {chartTooltip && (
                      <motion.div
                        key={String(chartTooltip.summary.conceptId)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="position-absolute top-0 translate-middle-x bg-white border rounded-3 shadow-sm p-3"
                        style={{
                          left: chartTooltip.left,
                          zIndex: 3,
                          minWidth: "220px",
                          pointerEvents: "none",
                        }}
                      >
                        <div className="fw-semibold text-dark mb-2">
                          {chartTooltip.summary.conceptLabel}
                        </div>
                        <div className="d-flex justify-content-between align-items-center gap-3 small mb-1">
                          <span className="text-primary">{t("Detailed")}</span>
                          <span className="fw-semibold text-dark">
                            {formatCurrency(chartTooltip.summary.detailed)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center gap-3 small mb-1">
                          <span className="text-success">{t("Active")}</span>
                          <span className="fw-semibold text-dark">
                            {formatCurrency(chartTooltip.summary.active)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center gap-3 small">
                          <span className="text-warning">{t("Inactive")}</span>
                          <span className="fw-semibold text-dark">
                            {formatCurrency(chartTooltip.summary.inactive)}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      key={selectedRequestFilter}
                      className="d-flex align-items-end gap-3 overflow-auto pb-3"
                      initial="hidden"
                      animate="visible"
                      style={{ minHeight: "320px" }}
                    >
                      {reportSummary.conceptSummaries.map((summary, summaryIndex) => (
                        <motion.div
                          key={String(summary.conceptId)}
                          className="d-flex flex-column align-items-center flex-shrink-0"
                          initial={{ opacity: 0, y: 22 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: summaryIndex * 0.06,
                          }}
                          whileHover={{ y: -4 }}
                          onMouseEnter={(event) =>
                            handleChartTooltipMove(summary, event)
                          }
                          onMouseMove={(event) =>
                            handleChartTooltipMove(summary, event)
                          }
                          onMouseLeave={handleChartTooltipLeave}
                          style={{ minWidth: "92px" }}
                        >
                          <div
                            className="d-flex align-items-end gap-1"
                            style={{ height: "240px" }}
                          >
                            <AnimatedChartBar
                              value={summary.detailed}
                              color={CHART_BAR_COLORS.detailed}
                              heightPercent={
                                maxChartValue > 0
                                  ? (summary.detailed / maxChartValue) * 100
                                  : 0
                              }
                              delay={summaryIndex * 0.08}
                            />
                            <AnimatedChartBar
                              value={summary.active}
                              color={CHART_BAR_COLORS.active}
                              heightPercent={
                                maxChartValue > 0
                                  ? (summary.active / maxChartValue) * 100
                                  : 0
                              }
                              delay={summaryIndex * 0.08 + 0.05}
                            />
                            <AnimatedChartBar
                              value={summary.inactive}
                              color={CHART_BAR_COLORS.inactive}
                              heightPercent={
                                maxChartValue > 0
                                  ? (summary.inactive / maxChartValue) * 100
                                  : 0
                              }
                              delay={summaryIndex * 0.08 + 0.1}
                            />
                          </div>
                          <motion.div
                            className="text-muted small text-center mt-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: summaryIndex * 0.06 + 0.2 }}
                          >
                            {truncateLabel(summary.conceptLabel)}
                          </motion.div>
                        </motion.div>
                      ))}
                    </motion.div>

                    <div className="d-flex flex-wrap justify-content-center gap-3 mt-3">
                      <div className="d-inline-flex align-items-center gap-2">
                        <span
                          className="rounded-1"
                          style={{
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#3b82f6",
                          }}
                        />
                        <span className="small text-muted">{t("Detailed")}</span>
                      </div>
                      <div className="d-inline-flex align-items-center gap-2">
                        <span
                          className="rounded-1"
                          style={{
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#22c55e",
                          }}
                        />
                        <span className="small text-muted">{t("Active")}</span>
                      </div>
                      <div className="d-inline-flex align-items-center gap-2">
                        <span
                          className="rounded-1"
                          style={{
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#f97316",
                          }}
                        />
                        <span className="small text-muted">{t("Inactive")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <h5 className="mb-4">{t("Detail by Concept")}</h5>

                {reportSummary.conceptSummaries.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    {t("No report data available for the selected filter.")}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t("Concept")}</th>
                          <th>{t("Detailed")}</th>
                          <th>{t("Active")}</th>
                          <th>{t("Inactive")}</th>
                          <th>{t("Share")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportSummary.conceptSummaries.map((summary) => (
                          <tr key={String(summary.conceptId)}>
                            <td className="fw-semibold">
                              {summary.conceptLabel}
                            </td>
                            <td className="text-primary fw-semibold">
                              {formatCurrency(summary.detailed)}
                            </td>
                            <td className="text-success fw-semibold">
                              {formatCurrency(summary.active)}
                            </td>
                            <td className="text-warning fw-semibold">
                              {formatCurrency(summary.inactive)}
                            </td>
                            <td>{formatPercent(summary.share)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </Container>
    </div>
  );
};

export default ReportsPage;
