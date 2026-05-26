import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
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
import { buildApiUrl } from "../../../../helpers/api-url";

interface TripReference {
  id: number;
  label: string;
}

interface ExpenseRequestDetailItem {
  expenseDetailId: number;
  conceptLabel: string;
  budgetedAmount: string;
  notes: string;
}

interface ExpenseRequestItem {
  idRequest: number;
  requestNumber: string;
  requesterId: number;
  reason: string;
  totalBudget: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  details: ExpenseRequestDetailItem[];
}

interface ScheduleTripItem {
  idTrip: number;
  tripNumber: string;
  vehicle: TripReference | null;
  driver: TripReference | null;
  origin: TripReference | null;
  destination: TripReference | null;
  departureDate: string;
  returnDate: string;
  notes: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  expenseRequests: ExpenseRequestItem[];
}

interface UserApiItem {
  userID: number;
  userName?: string;
  fullName?: string;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

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

const mapTripReference = (
  item: any,
  idKey: string,
  labelKey: string
): TripReference | null => {
  if (!item) {
    return null;
  }

  const id = Number(item[idKey] ?? 0);
  const label = String(item[labelKey] ?? "").trim();

  if (!id && !label) {
    return null;
  }

  return {
    id,
    label,
  };
};

const mapDriverReference = (item: any): TripReference | null => {
  if (!item) {
    return null;
  }

  const id = Number(item.idconductor ?? item.userID ?? item.userid ?? item.id ?? 0);
  const label = String(
    item.conductor_nm ??
      item.fullName ??
      item.fullname ??
      item.userName ??
      item.username ??
      ""
  ).trim();

  if (!id && !label) {
    return null;
  }

  return {
    id,
    label,
  };
};

const mapExpenseRequestDetail = (item: any): ExpenseRequestDetailItem => ({
  expenseDetailId: Number(item.expense_detail_id ?? 0),
  conceptLabel: String(item.concept?.nombre_concepto ?? "").trim(),
  budgetedAmount: String(item.budgeted_amount ?? "").trim(),
  notes: String(item.notes ?? "").trim(),
});

const mapExpenseRequest = (item: any): ExpenseRequestItem => ({
  idRequest: Number(item.id_request ?? 0),
  requestNumber: String(item.request_number ?? "").trim(),
  requesterId: Number(item.requester_name ?? 0),
  reason: String(item.reason ?? "").trim(),
  totalBudget: String(item.total_budget ?? "").trim(),
  statusLabel: String(item.status_data?.descripcion ?? item.status ?? "").trim(),
  createdAt: String(item.created_at ?? "").trim(),
  updatedAt: String(item.updated_at ?? "").trim(),
  details: Array.isArray(item.details) ? item.details.map(mapExpenseRequestDetail) : [],
});

const mapApiTrip = (item: any): ScheduleTripItem => ({
  idTrip: Number(item.id_trip ?? 0),
  tripNumber: String(item.trip_number ?? "").trim(),
  vehicle: mapTripReference(item.vehicle, "idvehiculo", "no_vehiculo"),
  driver: mapDriverReference(item.driver),
  origin: mapTripReference(item.origin_data, "idorigen", "nombre_origen"),
  destination: mapTripReference(
    item.destination_data,
    "idorigen",
    "nombre_origen"
  ),
  departureDate: String(item.departure_date ?? "").trim(),
  returnDate: String(item.return_date ?? "").trim(),
  notes: String(item.notes ?? "").trim(),
  status: Boolean(item.status),
  createdAt: String(item.created_at ?? "").trim(),
  updatedAt: String(item.updated_at ?? "").trim(),
  expenseRequests: Array.isArray(item.expense_requests)
    ? item.expense_requests.map(mapExpenseRequest)
    : [],
});

const mapApiUser = (item: any): UserApiItem => ({
  userID: Number(item.userID ?? item.userid ?? item.id ?? 0),
  userName: String(item.userName ?? item.username ?? "").trim(),
  fullName: String(item.fullName ?? item.fullname ?? "").trim(),
});

const mapUserLookup = (users: UserApiItem[]) =>
  users.reduce<Record<number, string>>((acc, item) => {
    const label =
      String(item.fullName ?? "").trim() ||
      String(item.userName ?? "").trim() ||
      String(item.userID);

    acc[item.userID] = label;
    return acc;
  }, {});

const getStatusMeta = (status: boolean, t: (key: string) => string) =>
  status
    ? {
        label: t("Active"),
        className:
          "badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-checkbox-circle-line",
      }
    : {
        label: t("Inactive"),
        className:
          "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-close-circle-line",
      };

const formatDateTime = (value: string) => {
  const parsedDate = moment(value, moment.ISO_8601, true);
  return parsedDate.isValid() ? parsedDate.format("DD/MM/YYYY HH:mm") : "-";
};

const formatAmount = (value: string) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return value || "-";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(parsedValue);
};

const TravelMyScheduleDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<ScheduleTripItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [requesterLookup, setRequesterLookup] = useState<Record<number, string>>(
    {}
  );

  const parsedTripId = useMemo(
    () => (/^\d+$/.test(tripId || "") ? Number(tripId) : null),
    [tripId]
  );

  const fetchTripDetail = useCallback(async () => {
    try {
      if (parsedTripId === null) {
        throw new Error(t("Error loading schedule detail"));
      }

      setLoadingDetail(true);
      setFeedback(null);

      const [tripResponse, requestsResponse, usersResponse] = await Promise.all([
        fetch(buildApiUrl(`trips/${parsedTripId}/`), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("expense-requests/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("users/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
      ]);

      const [tripData, requestsData, usersData] = await Promise.all([
        tripResponse.json().catch(() => null),
        requestsResponse.json().catch(() => null),
        usersResponse.json().catch(() => null),
      ]);

      if (!tripResponse.ok || !tripData?.success || !tripData?.data) {
        throw new Error(tripData?.message || t("Error loading schedule detail"));
      }

      if (
        !requestsResponse.ok ||
        !requestsData?.success ||
        !Array.isArray(requestsData?.data)
      ) {
        throw new Error(
          requestsData?.message || t("Error loading schedule detail")
        );
      }

      if (!usersResponse.ok || !usersData?.success || !Array.isArray(usersData?.data)) {
        throw new Error(usersData?.message || t("Error loading schedule detail"));
      }

      const nextRequesterLookup = mapUserLookup(
        (usersData.data as any[]).map(mapApiUser)
      );
      const detailedTrip = mapApiTrip(tripData.data);
      const filteredRequests = (requestsData.data as any[])
        .filter(
          (request) =>
            Number(request.id_trip ?? request.trip?.id_trip ?? 0) === parsedTripId
        )
        .map(mapExpenseRequest);

      setRequesterLookup(nextRequesterLookup);
      setTrip({
        ...detailedTrip,
        expenseRequests: filteredRequests,
      });
    } catch (detailError: any) {
      setFeedback({
        type: "danger",
        message: detailError?.message || t("Error loading schedule detail"),
      });
    } finally {
      setLoadingDetail(false);
    }
  }, [parsedTripId, t]);

  useEffect(() => {
    document.title = `${t("My Schedule")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchTripDetail();
  }, [fetchTripDetail]);

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

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "my-schedule-detail-feedback") {
      setFeedback(null);
    }
  };

  const getRequesterLabel = (requesterId: number) =>
    requesterLookup[requesterId] || `#${requesterId || "-"}`;

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
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
                onClick={() => navigate("/travel-expenses/my-schedule")}
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
                        <div className="fw-semibold">
                          {trip.vehicle?.label || "-"}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-muted small">{t("Driver")}</div>
                        <div className="fw-semibold">
                          {trip.driver?.label || "-"}
                        </div>
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

export default TravelMyScheduleDetailPage;
