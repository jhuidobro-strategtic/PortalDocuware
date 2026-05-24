import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
} from "reactstrap";

import AppPagination from "../../../../components/common/Pagination";
import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { buildApiUrl } from "../../../../helpers/api-url";

interface TripReference {
  id: number;
  label: string;
}

interface ExpenseRequestTrip {
  idTrip: number;
  tripNumber: string;
  vehicle: TripReference | null;
  driver: TripReference | null;
  origin: TripReference | null;
  destination: TripReference | null;
  departureDate: string;
  returnDate: string;
}

interface ExpenseConceptReference {
  id: number;
  label: string;
}

interface ExpenseRequestDetail {
  expenseDetailId: number;
  concept: ExpenseConceptReference | null;
  budgetedAmount: string;
  notes: string;
}

interface ExpenseRequestItem {
  idRequest: number;
  requestNumber: string;
  requesterId: number | null;
  requesterName: string;
  reason: string;
  totalBudget: string;
  status: boolean;
  createdAt: string;
  trip: ExpenseRequestTrip | null;
  details: ExpenseRequestDetail[];
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

interface UserApiItem {
  userID: number;
  userName?: string;
  fullName?: string;
}

const ITEMS_PER_PAGE = 10;

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

const matchesSearchValue = (value: unknown, term: string): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => matchesSearchValue(item, term));
  }

  if (typeof value === "object") {
    return Object.values(value).some((item) => matchesSearchValue(item, term));
  }

  const normalizedValue = String(value).toLowerCase();
  if (normalizedValue.includes(term)) {
    return true;
  }

  if (typeof value === "string") {
    const parsedDate = moment(value, moment.ISO_8601, true);
    if (parsedDate.isValid()) {
      return parsedDate.format("DD/MM/YYYY HH:mm").toLowerCase().includes(term);
    }
  }

  return false;
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

  return { id, label };
};

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

const mapExpenseRequestTrip = (item: any): ExpenseRequestTrip | null => {
  if (!item) {
    return null;
  }

  return {
    idTrip: Number(item.id_trip ?? 0),
    tripNumber: String(item.trip_number ?? "").trim(),
    vehicle: mapTripReference(item.vehicle, "idvehiculo", "no_vehiculo"),
    driver: mapTripReference(item.driver, "idconductor", "conductor_nm"),
    origin: mapTripReference(item.origin_data, "idorigen", "nombre_origen"),
    destination: mapTripReference(
      item.destination_data,
      "idorigen",
      "nombre_origen"
    ),
    departureDate: String(item.departure_date ?? "").trim(),
    returnDate: String(item.return_date ?? "").trim(),
  };
};

const mapExpenseRequestDetail = (item: any): ExpenseRequestDetail => ({
  expenseDetailId: Number(item.expense_detail_id ?? 0),
  concept: mapExpenseConceptReference(item.concept),
  budgetedAmount: String(item.budgeted_amount ?? "").trim(),
  notes: String(item.notes ?? "").trim(),
});

const mapExpenseRequest = (item: any): ExpenseRequestItem => ({
  idRequest: Number(item.id_request ?? 0),
  requestNumber: String(item.request_number ?? "").trim(),
  requesterId: Number.isFinite(Number(item.requester_name))
    ? Number(item.requester_name)
    : null,
  requesterName: String(item.requester_name ?? item.created_by ?? "").trim(),
  reason: String(item.reason ?? "").trim(),
  totalBudget: String(item.total_budget ?? "").trim(),
  status: Boolean(item.status),
  createdAt: String(item.created_at ?? "").trim(),
  trip: mapExpenseRequestTrip(item.trip),
  details: Array.isArray(item.details)
    ? item.details.map(mapExpenseRequestDetail)
    : [],
});

const mapUserLookup = (items: UserApiItem[]) =>
  items.reduce((acc: Record<number, string>, item) => {
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

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(parsedValue);
};

const RequestsPage = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ExpenseRequestItem[]>([]);
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] =
    useState<ExpenseRequestItem | null>(null);

  const userLookup = useMemo(() => mapUserLookup(users), [users]);

  const fetchExpenseRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
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
      setLoadingRequests(false);
    }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl("users/"), {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
        throw new Error(
          data?.message || t("Error loading expense request catalogs")
        );
      }

      setUsers(data.data as UserApiItem[]);
    } catch (usersError: any) {
      setFeedback({
        type: "danger",
        message:
          usersError?.message || t("Error loading expense request catalogs"),
      });
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("Requests")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void Promise.all([fetchExpenseRequests(), fetchUsers()]);
  }, [fetchExpenseRequests, fetchUsers]);

  const filteredRequests = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return requests;
    }

    return requests.filter((request) =>
      matchesSearchValue(request, normalizedTerm)
    );
  }, [requests, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "expense-requests-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "expense-requests-feedback") {
      setFeedback(null);
    }
  };

  const getRequesterLabel = (request: ExpenseRequestItem) =>
    (request.requesterId !== null
      ? userLookup[request.requesterId]
      : undefined) ||
    request.requesterName ||
    "-";

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />

        <BreadCrumb title="Requests" pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("Requests")}</h5>
                <p className="text-muted mb-0">
                  {t("Latest registered expense requests.")}
                </p>
              </div>

              <InputGroup style={{ width: "320px", maxWidth: "100%" }}>
                <InputGroupText>
                  <i className="ri-search-line" />
                </InputGroupText>
                <Input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t("Search requests...")}
                />
              </InputGroup>
            </div>

            {loadingRequests ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "170px" }}>{t("Request Number")}</th>
                        <th style={{ minWidth: "280px" }}>{t("Reason")}</th>
                        <th style={{ width: "160px" }}>{t("Requested by")}</th>
                        <th style={{ width: "130px" }}>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4">
                            {t("No expense requests were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map((request) => (
                          <tr key={request.idRequest}>
                            <td className="fw-semibold">
                              {request.requestNumber || "-"}
                            </td>
                            <td
                              className="text-wrap"
                              style={{ whiteSpace: "normal" }}
                            >
                              {request.reason || "-"}
                            </td>
                            <td>{getRequesterLabel(request)}</td>
                            <td>
                              <Button
                                color="light"
                                size="sm"
                                className="d-inline-flex align-items-center gap-1"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <i className="ri-eye-line" />
                                <span>{t("View")}</span>
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <AppPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredRequests.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </Container>

      <Modal
        isOpen={selectedRequest !== null}
        toggle={() => setSelectedRequest(null)}
        centered
        size="lg"
      >
        <ModalHeader toggle={() => setSelectedRequest(null)}>
          {selectedRequest?.requestNumber || t("Request Details")}
        </ModalHeader>
        <ModalBody className="p-4">
          {selectedRequest && (
            <div className="d-flex flex-column gap-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="text-muted small">{t("Requested by")}</div>
                  <div className="fw-semibold">
                    {getRequesterLabel(selectedRequest)}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">{t("Status")}</div>
                  <div>
                    <span
                      className={
                        getStatusMeta(selectedRequest.status, t).className
                      }
                    >
                      <i
                        className={getStatusMeta(selectedRequest.status, t).icon}
                      />
                      <span>{getStatusMeta(selectedRequest.status, t).label}</span>
                    </span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">{t("Trip")}</div>
                  <div className="fw-semibold">
                    {selectedRequest.trip?.tripNumber || "-"}
                  </div>
                  <div className="text-muted small">
                    {selectedRequest.trip
                      ? `${selectedRequest.trip.origin?.label || "-"} -> ${
                          selectedRequest.trip.destination?.label || "-"
                        }`
                      : "-"}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">{t("Total Budget")}</div>
                  <div className="fw-semibold">
                    {formatAmount(selectedRequest.totalBudget)}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">{t("Departure Date")}</div>
                  <div>
                    {selectedRequest.trip
                      ? formatDateTime(selectedRequest.trip.departureDate)
                      : "-"}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">{t("Return Date")}</div>
                  <div>
                    {selectedRequest.trip
                      ? formatDateTime(selectedRequest.trip.returnDate)
                      : "-"}
                  </div>
                </div>
                <div className="col-12">
                  <div className="text-muted small">{t("Reason")}</div>
                  <div>{selectedRequest.reason || "-"}</div>
                </div>
                <div className="col-12">
                  <div className="text-muted small">{t("Created on")}</div>
                  <div>{formatDateTime(selectedRequest.createdAt)}</div>
                </div>
              </div>

              <div>
                <h6 className="mb-3">{t("Expense Details")}</h6>
                {selectedRequest.details.length === 0 ? (
                  <p className="text-muted mb-0">{t("No details available")}</p>
                ) : (
                  <div className="table-responsive">
                    <Table className="table align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t("Concept")}</th>
                          <th>{t("Budget")}</th>
                          <th>{t("Notes")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.details.map((detail) => (
                          <tr key={detail.expenseDetailId}>
                            <td>{detail.concept?.label || "-"}</td>
                            <td>{formatAmount(detail.budgetedAmount)}</td>
                            <td>{detail.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setSelectedRequest(null)}>
            {t("Close")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default RequestsPage;
