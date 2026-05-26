import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
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

interface TripItem {
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
}

interface VehicleItem {
  idvehiculo: number;
  no_vehiculo: string;
}

interface DriverItem {
  idconductor: number;
  conductor_nm: string;
}

interface DestinationItem {
  idorigen: number;
  nombre_origen: string;
}

interface SessionUser {
  id: number | null;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

interface TripFormValues {
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  notes: string;
  status: boolean;
}

type TripFormField =
  | "tripNumber"
  | "vehicleId"
  | "driverId"
  | "origin"
  | "destination"
  | "departureDate"
  | "returnDate";

type TripFormErrors = Partial<Record<TripFormField, string>>;

interface SelectOption {
  value: string;
  label: string;
}

const ITEMS_PER_PAGE = 10;
const DATE_TIME_INPUT_FORMAT = "YYYY-MM-DDTHH:mm";

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: "38px",
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
};

const createEmptyTripForm = (): TripFormValues => ({
  tripNumber: "",
  vehicleId: "",
  driverId: "",
  origin: "",
  destination: "",
  departureDate: "",
  returnDate: "",
  notes: "",
  status: true,
});

const mapTripToFormValues = (trip: TripItem): TripFormValues => ({
  tripNumber: trip.tripNumber,
  vehicleId: trip.vehicle ? String(trip.vehicle.id) : "",
  driverId: trip.driver ? String(trip.driver.id) : "",
  origin: trip.origin ? String(trip.origin.id) : "",
  destination: trip.destination ? String(trip.destination.id) : "",
  departureDate: moment(trip.departureDate, moment.ISO_8601, true).isValid()
    ? moment(trip.departureDate).format(DATE_TIME_INPUT_FORMAT)
    : "",
  returnDate: moment(trip.returnDate, moment.ISO_8601, true).isValid()
    ? moment(trip.returnDate).format(DATE_TIME_INPUT_FORMAT)
    : "",
  notes: trip.notes,
  status: trip.status,
});

const getCurrentSessionUser = (): SessionUser => {
  try {
    const authUser = sessionStorage.getItem("authUser");

    if (!authUser) {
      return { id: null };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};
    const parsedId = Number(
      sessionData?.userID ?? sessionData?.id ?? sessionData?.profileID ?? ""
    );

    return {
      id: Number.isFinite(parsedId) ? parsedId : null,
    };
  } catch {
    return { id: null };
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

const mapApiTrip = (item: any): TripItem => ({
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
  notes: String(item.notes ?? "").trim(),
  status: Boolean(item.status),
  createdAt: String(item.created_at ?? "").trim(),
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

const validateTripForm = (
  values: TripFormValues,
  t: (key: string, options?: Record<string, unknown>) => string
): TripFormErrors => {
  const errors: TripFormErrors = {};
  const parsedDepartureDate = moment(
    values.departureDate,
    DATE_TIME_INPUT_FORMAT,
    true
  );
  const parsedReturnDate = moment(values.returnDate, DATE_TIME_INPUT_FORMAT, true);

  if (!values.tripNumber.trim()) {
    errors.tripNumber = t("Complete the {{field}} field.", {
      field: t("Trip Number"),
    });
  }

  if (!values.vehicleId.trim()) {
    errors.vehicleId = t("Complete the {{field}} field.", {
      field: t("Vehicle"),
    });
  }

  if (!values.driverId.trim()) {
    errors.driverId = t("Complete the {{field}} field.", {
      field: t("Driver"),
    });
  }

  if (!values.origin.trim() || Number(values.origin) <= 0) {
    errors.origin = t("Complete the {{field}} field.", {
      field: t("Origin"),
    });
  }

  if (!values.destination.trim() || Number(values.destination) <= 0) {
    errors.destination = t("Complete the {{field}} field.", {
      field: t("Destination"),
    });
  }

  if (!parsedDepartureDate.isValid()) {
    errors.departureDate = t("Complete the {{field}} field.", {
      field: t("Departure Date"),
    });
  }

  if (!parsedReturnDate.isValid()) {
    errors.returnDate = t("Complete the {{field}} field.", {
      field: t("Return Date"),
    });
  } else if (
    parsedDepartureDate.isValid() &&
    parsedReturnDate.isBefore(parsedDepartureDate)
  ) {
    errors.returnDate = t("Return date must be after departure date.");
  }

  return errors;
};

const buildTripPayload = (values: TripFormValues, createdBy: number) => ({
  trip_number: values.tripNumber.trim(),
  vehicle_id: Number(values.vehicleId),
  driver_id: Number(values.driverId),
  origin: Number(values.origin),
  destination: Number(values.destination),
  departure_date: moment(values.departureDate, DATE_TIME_INPUT_FORMAT, true).toISOString(),
  return_date: moment(values.returnDate, DATE_TIME_INPUT_FORMAT, true).toISOString(),
  notes: values.notes.trim(),
  status: true,
  created_by: createdBy,
});

const buildTripUpdatePayload = (
  values: TripFormValues,
  userId: number,
  tripId: number
) => ({
  ...buildTripPayload(values, userId),
  id_trip: tripId,
});

const TripsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessionUser = getCurrentSessionUser();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingTripCatalogs, setLoadingTripCatalogs] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormValues, setCreateFormValues] = useState<TripFormValues>(
    createEmptyTripForm()
  );
  const [createFormErrors, setCreateFormErrors] = useState<TripFormErrors>({});
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripItem | null>(null);
  const [editFormValues, setEditFormValues] = useState<TripFormValues>(
    createEmptyTripForm()
  );
  const [editFormErrors, setEditFormErrors] = useState<TripFormErrors>({});
  const [updatingTrip, setUpdatingTrip] = useState(false);

  const vehicleOptions = useMemo<SelectOption[]>(
    () =>
      vehicles.map((vehicle) => ({
        value: String(vehicle.idvehiculo),
        label: vehicle.no_vehiculo,
      })),
    [vehicles]
  );

  const driverOptions = useMemo<SelectOption[]>(
    () =>
      drivers.map((driver) => ({
        value: String(driver.idconductor),
        label: driver.conductor_nm,
      })),
    [drivers]
  );

  const destinationOptions = useMemo<SelectOption[]>(
    () =>
      destinations.map((destination) => ({
        value: String(destination.idorigen),
        label: destination.nombre_origen,
      })),
    [destinations]
  );

  const selectedVehicle =
    vehicleOptions.find((option) => option.value === createFormValues.vehicleId) ??
    null;
  const selectedDriver =
    driverOptions.find((option) => option.value === createFormValues.driverId) ??
    null;
  const selectedOrigin =
    destinationOptions.find((option) => option.value === createFormValues.origin) ??
    null;
  const selectedDestination =
    destinationOptions.find(
      (option) => option.value === createFormValues.destination
    ) ?? null;
  const selectedEditVehicle =
    vehicleOptions.find((option) => option.value === editFormValues.vehicleId) ??
    null;
  const selectedEditDriver =
    driverOptions.find((option) => option.value === editFormValues.driverId) ??
    null;
  const selectedEditOrigin =
    destinationOptions.find((option) => option.value === editFormValues.origin) ??
    null;
  const selectedEditDestination =
    destinationOptions.find(
      (option) => option.value === editFormValues.destination
    ) ?? null;

  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      setFeedback(null);

      const response = await fetch(buildApiUrl("trips/"), {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
        throw new Error(data?.message || t("Error loading trips"));
      }

      setTrips((data.data as any[]).map(mapApiTrip));
    } catch (fetchError: any) {
      setFeedback({
        type: "danger",
        message: fetchError?.message || t("Error loading trips"),
      });
    } finally {
      setLoadingTrips(false);
    }
  }, [t]);

  const fetchTripCatalogs = useCallback(async () => {
    try {
      setLoadingTripCatalogs(true);

      const [vehiclesResponse, driversResponse, destinationsResponse] =
        await Promise.all([
        fetch(buildApiUrl("vehiculos/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("conductores/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("destinos/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
      ]);

      const [vehiclesData, driversData, destinationsData] = await Promise.all([
        vehiclesResponse.json().catch(() => null),
        driversResponse.json().catch(() => null),
        destinationsResponse.json().catch(() => null),
      ]);

      if (!vehiclesResponse.ok || !Array.isArray(vehiclesData)) {
        throw new Error(t("Error loading trip catalogs"));
      }

      if (!driversResponse.ok || !Array.isArray(driversData)) {
        throw new Error(t("Error loading trip catalogs"));
      }

      if (
        !destinationsResponse.ok ||
        !destinationsData?.success ||
        !Array.isArray(destinationsData?.data)
      ) {
        throw new Error(
          destinationsData?.message || t("Error loading trip catalogs")
        );
      }

      setVehicles(vehiclesData as VehicleItem[]);
      setDrivers(driversData as DriverItem[]);
      setDestinations(destinationsData.data as DestinationItem[]);
    } catch (fetchError: any) {
      setFeedback({
        type: "danger",
        message: fetchError?.message || t("Error loading trip catalogs"),
      });
    } finally {
      setLoadingTripCatalogs(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("Trips")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchTrips();
    void fetchTripCatalogs();
  }, [fetchTripCatalogs, fetchTrips]);

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

  const handleOpenCreateModal = () => {
    setCreateFormValues(createEmptyTripForm());
    setCreateFormErrors({});
    setIsCreateModalOpen(true);

    if (
      vehicles.length === 0 ||
      drivers.length === 0 ||
      destinations.length === 0
    ) {
      void fetchTripCatalogs();
    }
  };

  const handleCloseCreateModal = () => {
    if (creatingTrip) {
      return;
    }

    setCreateFormValues(createEmptyTripForm());
    setCreateFormErrors({});
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (trip: TripItem) => {
    setEditingTrip(trip);
    setEditFormValues(mapTripToFormValues(trip));
    setEditFormErrors({});
    setIsEditModalOpen(true);

    if (
      vehicles.length === 0 ||
      drivers.length === 0 ||
      destinations.length === 0
    ) {
      void fetchTripCatalogs();
    }
  };

  const handleCloseEditModal = () => {
    if (updatingTrip) {
      return;
    }

    setEditingTrip(null);
    setEditFormValues(createEmptyTripForm());
    setEditFormErrors({});
    setIsEditModalOpen(false);
  };

  const handleCreateTrip = async (
    event?: React.FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();

    const validationErrors = validateTripForm(createFormValues, t);

    if (Object.keys(validationErrors).length > 0) {
      setCreateFormErrors(validationErrors);
      return;
    }

    if (sessionUser.id === null) {
      setFeedback({
        type: "danger",
        message: t("Unable to identify the signed-in user to create this trip."),
      });
      return;
    }

    try {
      setCreatingTrip(true);
      setCreateFormErrors({});

      const response = await fetch(buildApiUrl("trips/"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(buildTripPayload(createFormValues, sessionUser.id)),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t("Error creating trip"));
      }

      await fetchTrips();
      setCurrentPage(1);
      setIsCreateModalOpen(false);
      setCreateFormValues(createEmptyTripForm());
      setFeedback({
        type: "success",
        message: data?.message || t("Trip registered successfully."),
      });
    } catch (createError: any) {
      setFeedback({
        type: "danger",
        message: createError?.message || t("Error creating trip"),
      });
    } finally {
      setCreatingTrip(false);
    }
  };

  const handleEditTrip = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const validationErrors = validateTripForm(editFormValues, t);

    if (Object.keys(validationErrors).length > 0) {
      setEditFormErrors(validationErrors);
      return;
    }

    if (sessionUser.id === null) {
      setFeedback({
        type: "danger",
        message: t("Unable to identify the signed-in user to update this trip."),
      });
      return;
    }

    if (!editingTrip) {
      return;
    }

    try {
      setUpdatingTrip(true);
      setEditFormErrors({});

      const response = await fetch(buildApiUrl("trips/"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(
          buildTripUpdatePayload(editFormValues, sessionUser.id, editingTrip.idTrip)
        ),
      });
      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : null;

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || t("Error updating trip"));
      }

      await fetchTrips();
      setIsEditModalOpen(false);
      setEditingTrip(null);
      setEditFormValues(createEmptyTripForm());
      setFeedback({
        type: "success",
        message: data?.message || t("Trip updated successfully."),
      });
    } catch (updateError: any) {
      setFeedback({
        type: "danger",
        message: updateError?.message || t("Error updating trip"),
      });
    } finally {
      setUpdatingTrip(false);
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
                <Button color="primary" onClick={handleOpenCreateModal}>
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
                        <th style={{ width: "120px" }}>{t("Vehicle")}</th>
                        <th style={{ minWidth: "220px" }}>{t("Driver")}</th>
                        <th style={{ width: "140px" }}>{t("Origin")}</th>
                        <th style={{ width: "140px" }}>{t("Destination")}</th>
                        <th style={{ width: "170px" }}>{t("Departure Date")}</th>
                        <th style={{ width: "170px" }}>{t("Return Date")}</th>
                        <th style={{ minWidth: "240px" }}>{t("Notes")}</th>
                        <th style={{ width: "140px" }}>{t("Status")}</th>
                        <th style={{ width: "120px" }} className="text-center">
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrips.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center py-4">
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
                              <td>{trip.vehicle?.label || "-"}</td>
                              <td>{trip.driver?.label || "-"}</td>
                              <td>{trip.origin?.label || "-"}</td>
                              <td>{trip.destination?.label || "-"}</td>
                              <td>{formatDateTime(trip.departureDate)}</td>
                              <td>{formatDateTime(trip.returnDate)}</td>
                              <td
                                className="text-wrap"
                                style={{ whiteSpace: "normal" }}
                              >
                                {trip.notes || "-"}
                              </td>
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
                                      onClick: () => handleOpenEditModal(trip),
                                    },
                                    {
                                      id: `add-expense-${trip.idTrip}`,
                                      label: t("Generate Expense Request"),
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

      <Modal
        isOpen={isCreateModalOpen}
        toggle={creatingTrip ? undefined : handleCloseCreateModal}
        centered
        size="lg"
        backdrop={creatingTrip ? "static" : true}
        keyboard={!creatingTrip}
      >
        <ModalHeader toggle={creatingTrip ? undefined : handleCloseCreateModal}>
          {t("New Trip")}
        </ModalHeader>

        <Form onSubmit={handleCreateTrip}>
          <ModalBody className="p-4">
            {loadingTripCatalogs && (
              <div className="d-flex align-items-center gap-2 text-muted mb-3">
                <Spinner size="sm" />
                <span>{t("Loading...")}</span>
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Label className="form-label">
                  {t("Trip Number")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={createFormValues.tripNumber}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      tripNumber: event.target.value,
                    }))
                  }
                  invalid={Boolean(createFormErrors.tripNumber)}
                  placeholder="VJ-26-0002"
                  disabled={creatingTrip}
                />
                <FormFeedback>{createFormErrors.tripNumber}</FormFeedback>
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Vehicle")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedVehicle}
                  options={vehicleOptions}
                  onChange={(selected: SelectOption | null) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      vehicleId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select a vehicle")}
                  isClearable
                  isSearchable
                  isDisabled={creatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {createFormErrors.vehicleId && (
                  <div className="invalid-feedback d-block">
                    {createFormErrors.vehicleId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Driver")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedDriver}
                  options={driverOptions}
                  onChange={(selected: SelectOption | null) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      driverId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select a driver")}
                  isClearable
                  isSearchable
                  isDisabled={creatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {createFormErrors.driverId && (
                  <div className="invalid-feedback d-block">
                    {createFormErrors.driverId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Origin")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedOrigin}
                  options={destinationOptions}
                  onChange={(selected: SelectOption | null) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      origin: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select origin")}
                  isClearable
                  isSearchable
                  isDisabled={creatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {createFormErrors.origin && (
                  <div className="invalid-feedback d-block">
                    {createFormErrors.origin}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Destination")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedDestination}
                  options={destinationOptions}
                  onChange={(selected: SelectOption | null) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      destination: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select destination")}
                  isClearable
                  isSearchable
                  isDisabled={creatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {createFormErrors.destination && (
                  <div className="invalid-feedback d-block">
                    {createFormErrors.destination}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Departure Date")} <span className="text-danger">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={createFormValues.departureDate}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      departureDate: event.target.value,
                    }))
                  }
                  invalid={Boolean(createFormErrors.departureDate)}
                  disabled={creatingTrip}
                />
                <FormFeedback>{createFormErrors.departureDate}</FormFeedback>
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Return Date")} <span className="text-danger">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={createFormValues.returnDate}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      returnDate: event.target.value,
                    }))
                  }
                  invalid={Boolean(createFormErrors.returnDate)}
                  disabled={creatingTrip}
                />
                <FormFeedback>{createFormErrors.returnDate}</FormFeedback>
              </Col>

              <Col xs={12}>
                <Label className="form-label">{t("Notes")}</Label>
                <Input
                  type="textarea"
                  rows={3}
                  value={createFormValues.notes}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder={t("Enter notes...")}
                  disabled={creatingTrip}
                />
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button color="light" type="button" onClick={handleCloseCreateModal} disabled={creatingTrip}>
              {t("Cancel")}
            </Button>
            <Button color="primary" type="submit" disabled={creatingTrip}>
              {creatingTrip && <Spinner size="sm" className="me-2" />}
              <i className="ri-save-line align-bottom me-1" />
              {t("Register")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        toggle={updatingTrip ? undefined : handleCloseEditModal}
        centered
        size="lg"
        backdrop={updatingTrip ? "static" : true}
        keyboard={!updatingTrip}
      >
        <ModalHeader toggle={updatingTrip ? undefined : handleCloseEditModal}>
          {t("Edit Trip")}
        </ModalHeader>

        <Form onSubmit={handleEditTrip}>
          <ModalBody className="p-4">
            {loadingTripCatalogs && (
              <div className="d-flex align-items-center gap-2 text-muted mb-3">
                <Spinner size="sm" />
                <span>{t("Loading...")}</span>
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Label className="form-label">
                  {t("Trip Number")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={editFormValues.tripNumber}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      tripNumber: event.target.value,
                    }))
                  }
                  invalid={Boolean(editFormErrors.tripNumber)}
                  placeholder="VJ-26-0002"
                  disabled={updatingTrip}
                />
                <FormFeedback>{editFormErrors.tripNumber}</FormFeedback>
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Vehicle")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedEditVehicle}
                  options={vehicleOptions}
                  onChange={(selected: SelectOption | null) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      vehicleId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select a vehicle")}
                  isClearable
                  isSearchable
                  isDisabled={updatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {editFormErrors.vehicleId && (
                  <div className="invalid-feedback d-block">
                    {editFormErrors.vehicleId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Driver")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedEditDriver}
                  options={driverOptions}
                  onChange={(selected: SelectOption | null) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      driverId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select a driver")}
                  isClearable
                  isSearchable
                  isDisabled={updatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {editFormErrors.driverId && (
                  <div className="invalid-feedback d-block">
                    {editFormErrors.driverId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Origin")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedEditOrigin}
                  options={destinationOptions}
                  onChange={(selected: SelectOption | null) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      origin: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select origin")}
                  isClearable
                  isSearchable
                  isDisabled={updatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {editFormErrors.origin && (
                  <div className="invalid-feedback d-block">
                    {editFormErrors.origin}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Destination")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedEditDestination}
                  options={destinationOptions}
                  onChange={(selected: SelectOption | null) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      destination: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select destination")}
                  isClearable
                  isSearchable
                  isDisabled={updatingTrip || loadingTripCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {editFormErrors.destination && (
                  <div className="invalid-feedback d-block">
                    {editFormErrors.destination}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Departure Date")} <span className="text-danger">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={editFormValues.departureDate}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      departureDate: event.target.value,
                    }))
                  }
                  invalid={Boolean(editFormErrors.departureDate)}
                  disabled={updatingTrip}
                />
                <FormFeedback>{editFormErrors.departureDate}</FormFeedback>
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Return Date")} <span className="text-danger">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={editFormValues.returnDate}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      returnDate: event.target.value,
                    }))
                  }
                  invalid={Boolean(editFormErrors.returnDate)}
                  disabled={updatingTrip}
                />
                <FormFeedback>{editFormErrors.returnDate}</FormFeedback>
              </Col>

              <Col xs={12}>
                <Label className="form-label">{t("Notes")}</Label>
                <Input
                  type="textarea"
                  rows={3}
                  value={editFormValues.notes}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder={t("Enter notes...")}
                  disabled={updatingTrip}
                />
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button
              color="light"
              type="button"
              onClick={handleCloseEditModal}
              disabled={updatingTrip}
            >
              {t("Cancel")}
            </Button>
            <Button color="primary" type="submit" disabled={updatingTrip}>
              {updatingTrip && <Spinner size="sm" className="me-2" />}
              <i className="ri-save-line align-bottom me-1" />
              {t("Update")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default TripsPage;
