import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Spinner,
  Table,
} from "reactstrap";

import AppPagination from "../../../../components/common/Pagination";
import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import TableActionsMenu from "../../../../components/common/TableActionsMenu";
import { buildApiUrl } from "../../../../helpers/api-url";
import {
  getAuthHeaders,
  getCurrentSessionUser,
} from "../../my-schedule/shared/session";
import {
  fetchTrips as apiFetchTrips,
  TripItem,
} from "./services/trips.service";

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

const ITEMS_PER_PAGE = 10;

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

const TripsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingExpenseTripId, setGeneratingExpenseTripId] = useState<number | null>(null);

  const handleAutoGenerateExpenses = async (trip: TripItem) => {
    try {
      setGeneratingExpenseTripId(trip.idTrip);
      setFeedback(null);
      const sessionUser = getCurrentSessionUser();
      const requesterId = trip.driver?.id || sessionUser.id || 7;
      const createdBy = sessionUser.id || 7;

      const response = await fetch(
        buildApiUrl("expense-requests/auto-generate/"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id_trip: trip.idTrip,
            requester_name: requesterId,
            created_by: createdBy,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t("Error generating expenses for trip"));
      }

      setFeedback({
        type: "success",
        message: t(
          "Expenses auto-generated successfully for trip {{tripNumber}} (Total: S/. {{total}}).",
          {
            tripNumber: trip.tripNumber || `#${trip.idTrip}`,
            total: data.data?.total_budget || "0.00",
          }
        ),
      });
    } catch (err: any) {
      setFeedback({
        type: "danger",
        message: err?.message || t("Error generating expenses for trip"),
      });
    } finally {
      setGeneratingExpenseTripId(null);
    }
  };

  // Check flash message from navigation state (e.g. from AddTrip)
  useEffect(() => {
    const state = location.state as { message?: string; type?: FeedbackState["type"] } | null;
    if (state?.message) {
      setFeedback({
        type: state.type || "success",
        message: state.message,
      });
      // Clear state so reload doesn't repeat alert
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      setFeedback(null);
      const data = await apiFetchTrips();
      setTrips(data);
    } catch (fetchError: any) {
      setFeedback({
        type: "danger",
        message: fetchError?.message || t("Error loading trips"),
      });
    } finally {
      setLoadingTrips(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("Trips")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const filteredTrips = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return trips;
    }

    return trips.filter((trip) => matchesSearchValue(trip, normalizedTerm));
  }, [searchTerm, trips]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrips.length / ITEMS_PER_PAGE)
  );

  const paginatedTrips = filteredTrips.slice(
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
      id: "trips-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "trips-feedback") {
      setFeedback(null);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />

        <BreadCrumb title="Trips" pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("Trips")}</h5>
                <p className="text-muted mb-0">
                  {t("Latest registered trips.")}
                </p>
              </div>

              <div className="d-flex flex-column flex-sm-row gap-2 flex-shrink-0">
                <Button
                  color="primary"
                  onClick={() => navigate("/travel-expenses/trips/new")}
                >
                  <i className="ri-add-line align-bottom me-1" />
                  {t("New Trip")}
                </Button>

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
                    placeholder={t("Search trips...")}
                  />
                </InputGroup>
              </div>
            </div>

            {loadingTrips ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "90px" }}>ID</th>
                        <th style={{ width: "150px" }}>{t("Trip Number")}</th>
                        <th style={{ minWidth: "240px" }}>{t("Vehicle")}</th>
                        <th style={{ minWidth: "220px" }}>{t("Driver")}</th>
                        <th style={{ width: "140px" }}>{t("Origin")}</th>
                        <th style={{ width: "140px" }}>{t("Destination")}</th>
                        <th style={{ width: "170px" }}>{t("Departure Date")}</th>
                        <th style={{ width: "170px" }}>{t("Return Date")}</th>
                        <th style={{ width: "140px" }}>{t("Status")}</th>
                        <th style={{ width: "120px" }} className="text-center">
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrips.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-4">
                            {t("No trips were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedTrips.map((trip) => {
                          const statusMeta = getStatusMeta(trip.status, t);

                          return (
                            <tr key={trip.idTrip}>
                              <td>#{trip.idTrip}</td>
                              <td className="fw-semibold">
                                {trip.tripNumber || "-"}
                              </td>
                              <td style={{ minWidth: "240px" }}>
                                <div className="d-flex flex-column gap-1">
                                  <div className="d-flex align-items-center gap-1 flex-nowrap text-nowrap">
                                    {trip.configurationCode && (
                                      <span
                                        className="badge bg-primary-subtle text-primary border border-primary-subtle font-size-11 px-1.5 py-0.5"
                                        title={trip.configurationData?.name || trip.configurationCode}
                                      >
                                        {trip.configurationCode}
                                      </span>
                                    )}
                                    <span className="fw-semibold text-dark">
                                      <i className="ri-truck-line text-primary me-1 align-middle" />
                                      {trip.tractoPlate || trip.vehicle?.label || "-"}
                                    </span>
                                  </div>
                                  {trip.trailerPlates && trip.trailerPlates.length > 0 && (
                                    <div className="d-flex align-items-center gap-1 flex-nowrap text-nowrap mt-0.5">
                                      {trip.trailerPlates.map((plate, pIdx) => (
                                        <span
                                          key={pIdx}
                                          className="badge bg-light text-secondary border font-size-11 text-nowrap"
                                          title={`Remolque ${pIdx + 1}`}
                                        >
                                          <i className="ri-roadster-line me-1 text-muted" />
                                          {`R${pIdx + 1}: ${plate}`}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>{trip.driver?.label || "-"}</td>
                              <td>{trip.origin?.label || "-"}</td>
                              <td>{trip.destination?.label || "-"}</td>
                              <td>{formatDateTime(trip.departureDate)}</td>
                              <td>{formatDateTime(trip.returnDate)}</td>
                              <td>
                                <span className={statusMeta.className}>
                                  <i className={statusMeta.icon} />
                                  <span>{statusMeta.label}</span>
                                </span>
                              </td>
                              <td className="text-center">
                                <TableActionsMenu
                                  items={[
                                    {
                                      id: `edit-trip-${trip.idTrip}`,
                                      label: t("Edit"),
                                      icon: "ri-edit-line",
                                      tone: "neutral",
                                      onClick: () =>
                                        navigate(
                                          `/travel-expenses/trips/${trip.idTrip}/edit`
                                        ),
                                    },
                                    {
                                      id: `auto-generate-trip-${trip.idTrip}`,
                                      label:
                                        generatingExpenseTripId === trip.idTrip
                                          ? t("Generating...")
                                          : t("Autogenerate Expenses"),
                                      icon: "ri-magic-line",
                                      tone: "warning",
                                      onClick: () =>
                                        handleAutoGenerateExpenses(trip),
                                    },
                                    {
                                      id: `add-expense-${trip.idTrip}`,
                                      label: t("Enter / Adjust Expenses"),
                                      icon: "ri-money-dollar-circle-line",
                                      tone: "success",
                                      onClick: () =>
                                        navigate(
                                          `/travel-expenses/trips/${trip.idTrip}/add-expense`
                                        ),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <AppPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredTrips.length}
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
    </div>
  );
};

export default TripsPage;
