import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
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

interface TripReference {
  id: number;
  label: string;
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
}

interface SessionUser {
  id: number | null;
  profileId: number | null;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

const ITEMS_PER_PAGE = 10;

const getCurrentSessionUser = (): SessionUser => {
  try {
    const authUser = sessionStorage.getItem("authUser");

    if (!authUser) {
      return { id: null, profileId: null };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};
    const parsedId = Number(sessionData?.userID ?? sessionData?.id ?? "");
    const parsedProfileId = Number(
      sessionData?.profileID ??
        sessionData?.profile_id ??
        sessionData?.profile?.profileID ??
        sessionData?.profile?.profile_id ??
        ""
    );

    return {
      id: Number.isFinite(parsedId) ? parsedId : null,
      profileId: Number.isFinite(parsedProfileId) ? parsedProfileId : null,
    };
  } catch {
    return { id: null, profileId: null };
  }
};

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
});

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

const TravelMySchedulePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessionUser = useMemo(() => getCurrentSessionUser(), []);
  const [trips, setTrips] = useState<ScheduleTripItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const isAdminProfile =
    sessionUser.profileId === 1 || sessionUser.profileId === 2;

  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      setFeedback(null);

      if (!isAdminProfile && sessionUser.id === null) {
        throw new Error(
          t("Unable to identify the signed-in user to load this schedule.")
        );
      }

      const tripsPath = isAdminProfile
        ? "trips/"
        : `trips/?driver_id=${encodeURIComponent(String(sessionUser.id))}`;

      const tripsResponse = await fetch(buildApiUrl(tripsPath), {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      const tripsData = await tripsResponse.json().catch(() => null);

      if (!tripsResponse.ok || !tripsData?.success || !Array.isArray(tripsData?.data)) {
        throw new Error(tripsData?.message || t("Error loading schedule"));
      }

      setTrips((tripsData.data as any[]).map(mapApiTrip));
    } catch (fetchError: any) {
      setFeedback({
        type: "danger",
        message: fetchError?.message || t("Error loading schedule"),
      });
    } finally {
      setLoadingTrips(false);
    }
  }, [isAdminProfile, sessionUser.id, t]);

  useEffect(() => {
    document.title = `${t("My Schedule")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

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
      id: "my-schedule-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "my-schedule-feedback") {
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

        <BreadCrumb title="My Schedule" pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("My Schedule")}</h5>
                <p className="text-muted mb-0">
                  {isAdminProfile
                    ? t("All trips available for admin profiles.")
                    : t("Trips assigned to the signed-in driver.")}
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
                  placeholder={t("Search trips...")}
                />
              </InputGroup>
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
                        <th style={{ minWidth: "220px" }}>{t("Trip Number")}</th>
                        <th style={{ width: "140px" }}>{t("Vehicle")}</th>
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
                              <td>
                                <div className="fw-semibold">
                                  {trip.tripNumber || "-"}
                                </div>
                                {trip.notes ? (
                                  <div
                                    className="text-muted small text-wrap"
                                    style={{ whiteSpace: "normal" }}
                                  >
                                    {trip.notes}
                                  </div>
                                ) : null}
                              </td>
                              <td>{trip.vehicle?.label || "-"}</td>
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
                                      id: `view-schedule-${trip.idTrip}`,
                                      label: t("View"),
                                      icon: "ri-eye-line",
                                      tone: "neutral",
                                      onClick: () =>
                                        navigate(
                                          `/travel-expenses/my-schedule/${trip.idTrip}`
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

export default TravelMySchedulePage;
