import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { formatAmount, formatDateTime, getStatusMeta } from "../shared/formatters";
import { FeedbackState, ScheduleTrip } from "../shared/types";

interface MyScheduleDetailDesktopViewProps {
  clearFeedback: () => void;
  feedback: FeedbackState | null;
  getRequesterLabel: (requesterId: number) => string;
  loadingDetail: boolean;
  onBack: () => void;
  trip: ScheduleTrip | null;
}

export const MyScheduleDetailDesktopView = ({
  clearFeedback,
  feedback,
  getRequesterLabel,
  loadingDetail,
  onBack,
  trip,
}: MyScheduleDetailDesktopViewProps) => {
  const { t } = useTranslation();
  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "my-schedule-detail-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={clearFeedback}
        />

        <BreadCrumb title="My Schedule" pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">
                  {t("Trip")} {trip ? `#${trip.idTrip}` : ""}
                </h5>
                <p className="text-muted mb-0">
                  {trip?.tripNumber || t("Loading...")}
                </p>
              </div>

              <Button
                color="light"
                className="d-inline-flex align-items-center gap-2"
                onClick={onBack}
              >
                <i className="ri-arrow-left-line" />
                <span>{t("Back")}</span>
              </Button>
            </div>

            {loadingDetail ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : trip ? (
              <div className="d-flex flex-column gap-4">
                <Card className="border shadow-sm mb-0">
                  <CardBody>
                    <h6 className="mb-3">{t("Trip")}</h6>
                    <Row className="g-3">
                      <Col md={4}>
                        <div className="text-muted small">{t("Trip Number")}</div>
                        <div className="fw-semibold">{trip.tripNumber || "-"}</div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Vehicle")}</div>
                        <div className="fw-semibold">{trip.vehicle?.label || "-"}</div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Driver")}</div>
                        <div className="fw-semibold">{trip.driver?.label || "-"}</div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Origin")}</div>
                        <div className="fw-semibold">{trip.origin?.label || "-"}</div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Destination")}</div>
                        <div className="fw-semibold">
                          {trip.destination?.label || "-"}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Status")}</div>
                        <div>
                          <span className={getStatusMeta(trip.status, t).className}>
                            <i className={getStatusMeta(trip.status, t).icon} />
                            <span>{getStatusMeta(trip.status, t).label}</span>
                          </span>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Departure Date")}</div>
                        <div className="fw-semibold">
                          {formatDateTime(trip.departureDate)}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Return Date")}</div>
                        <div className="fw-semibold">
                          {formatDateTime(trip.returnDate)}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Created")}</div>
                        <div className="fw-semibold">
                          {formatDateTime(trip.createdAt)}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Updated")}</div>
                        <div className="fw-semibold">
                          {formatDateTime(trip.updatedAt)}
                        </div>
                      </Col>
                      <Col md={12}>
                        <div className="text-muted small">{t("Notes")}</div>
                        <div className="fw-semibold">{trip.notes || "-"}</div>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>

                <Card className="border shadow-sm mb-0">
                  <CardBody>
                    <h6 className="mb-3">{t("Expense Requests")}</h6>
                    {trip.expenseRequests.length === 0 ? (
                      <div className="text-muted">
                        {t("No associated expense requests.")}
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {trip.expenseRequests.map((request) => (
                          <div
                            key={request.idRequest}
                            className="border rounded-3 p-3 bg-light-subtle"
                          >
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                              <div>
                                <div className="fw-semibold">
                                  {request.requestNumber || "-"}
                                </div>
                                <div className="text-muted small">
                                  {request.reason || "-"}
                                </div>
                                <div className="small mt-1">
                                  {t("Requested by")}:{" "}
                                  <span className="fw-semibold">
                                    {getRequesterLabel(request.requesterId)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-md-end">
                                <span className="badge rounded-pill bg-info-subtle text-info border border-info-subtle mb-2">
                                  {request.statusLabel || "-"}
                                </span>
                                <div className="small">
                                  {t("Total Budget")}:{" "}
                                  <span className="fw-semibold">
                                    {formatAmount(request.totalBudget)}
                                  </span>
                                </div>
                                <div className="small text-muted mt-1">
                                  {t("Created")}: {formatDateTime(request.createdAt)}
                                </div>
                                <div className="small text-muted">
                                  {t("Updated")}: {formatDateTime(request.updatedAt)}
                                </div>
                              </div>
                            </div>

                            <div className="table-responsive">
                              <Table className="table align-middle table-nowrap mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>{t("Concept")}</th>
                                    <th style={{ width: "160px" }}>{t("Budget")}</th>
                                    <th>{t("Notes")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {request.details.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} className="text-center py-3">
                                        {t("No records found")}
                                      </td>
                                    </tr>
                                  ) : (
                                    request.details.map((detail) => (
                                      <tr key={detail.expenseDetailId}>
                                        <td>{detail.conceptLabel || "-"}</td>
                                        <td>{formatAmount(detail.budgetedAmount)}</td>
                                        <td>{detail.notes || "-"}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};
