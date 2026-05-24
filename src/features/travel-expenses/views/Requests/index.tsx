import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import Select from "react-select";
import { useTranslation } from "react-i18next";
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

interface SessionUser {
  id: number | null;
}

interface ExpenseRequestFormDetailValues {
  conceptId: string;
  budgetedAmount: string;
  notes: string;
}

interface ExpenseRequestFormValues {
  tripId: string;
  requestNumber: string;
  requesterId: string;
  reason: string;
  totalBudget: string;
  details: ExpenseRequestFormDetailValues[];
}

type ExpenseRequestFormField =
  | "tripId"
  | "requestNumber"
  | "requesterId"
  | "reason"
  | "totalBudget";

type ExpenseRequestFormErrors = Partial<
  Record<ExpenseRequestFormField, string>
>;

type ExpenseRequestDetailFormErrors = Partial<
  Record<"conceptId" | "budgetedAmount", string>
>;

interface SelectOption {
  value: string;
  label: string;
}

const ITEMS_PER_PAGE = 10;

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

const createEmptyExpenseRequestDetailForm =
  (): ExpenseRequestFormDetailValues => ({
    conceptId: "",
    budgetedAmount: "",
    notes: "",
  });

const createEmptyExpenseRequestForm = (
  requesterId = ""
): ExpenseRequestFormValues => ({
  tripId: "",
  requestNumber: "",
  requesterId,
  reason: "",
  totalBudget: "",
  details: [createEmptyExpenseRequestDetailForm()],
});

const createDefaultExpenseRequestForm = (
  requesterId = ""
): ExpenseRequestFormValues => ({
  ...createEmptyExpenseRequestForm(requesterId),
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

const buildTripOptionLabel = (trip: ExpenseRequestTrip) =>
  [
    trip.tripNumber || `#${trip.idTrip}`,
    `${trip.origin?.label || "-"} -> ${trip.destination?.label || "-"}`,
  ].join(" - ");

const validateExpenseRequestForm = (
  values: ExpenseRequestFormValues,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  const formErrors: ExpenseRequestFormErrors = {};
  const detailErrors: ExpenseRequestDetailFormErrors[] = values.details.map(
    () => ({})
  );
  let detailsError = "";

  if (!values.tripId.trim()) {
    formErrors.tripId = t("Complete the {{field}} field.", {
      field: t("Trip"),
    });
  }

  if (!values.requestNumber.trim()) {
    formErrors.requestNumber = t("Complete the {{field}} field.", {
      field: t("Request Number"),
    });
  }

  if (!values.requesterId.trim()) {
    formErrors.requesterId = t("Complete the {{field}} field.", {
      field: t("Requested by"),
    });
  }

  if (!values.reason.trim()) {
    formErrors.reason = t("Complete the {{field}} field.", {
      field: t("Reason"),
    });
  }

  if (
    !values.totalBudget.trim() ||
    !Number.isFinite(Number(values.totalBudget)) ||
    Number(values.totalBudget) <= 0
  ) {
    formErrors.totalBudget = t("Complete the {{field}} field.", {
      field: t("Total Budget"),
    });
  }

  if (values.details.length === 0) {
    detailsError = t("At least one expense detail is required.");
  }

  values.details.forEach((detail, index) => {
    if (!detail.conceptId.trim()) {
      detailErrors[index].conceptId = t("Complete the {{field}} field.", {
        field: t("Concept"),
      });
    }

    if (
      !detail.budgetedAmount.trim() ||
      !Number.isFinite(Number(detail.budgetedAmount)) ||
      Number(detail.budgetedAmount) <= 0
    ) {
      detailErrors[index].budgetedAmount = t("Complete the {{field}} field.", {
        field: t("Budget"),
      });
    }
  });

  return {
    formErrors,
    detailErrors,
    detailsError,
    hasErrors:
      Object.keys(formErrors).length > 0 ||
      detailErrors.some((detail) => Object.keys(detail).length > 0) ||
      detailsError !== "",
  };
};

const buildExpenseRequestPayload = (
  values: ExpenseRequestFormValues,
  createdBy: number
) => ({
  id_trip: Number(values.tripId),
  request_number: values.requestNumber.trim(),
  requester_name: Number(values.requesterId),
  reason: values.reason.trim(),
  total_budget: values.totalBudget.trim(),
  status: true,
  created_by: createdBy,
  details: values.details.map((detail) => ({
    id_concept: Number(detail.conceptId),
    budgeted_amount: detail.budgetedAmount.trim(),
    notes: detail.notes.trim(),
    created_by: createdBy,
  })),
});

const RequestsPage = () => {
  const { t } = useTranslation();
  const sessionUser = getCurrentSessionUser();
  const [requests, setRequests] = useState<ExpenseRequestItem[]>([]);
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [tripOptionsData, setTripOptionsData] = useState<ExpenseRequestTrip[]>(
    []
  );
  const [concepts, setConcepts] = useState<ExpenseConceptReference[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] =
    useState<ExpenseRequestItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormValues, setCreateFormValues] =
    useState<ExpenseRequestFormValues>(
      createDefaultExpenseRequestForm(
        sessionUser.id !== null ? String(sessionUser.id) : ""
      )
    );
  const [createFormErrors, setCreateFormErrors] =
    useState<ExpenseRequestFormErrors>({});
  const [createDetailErrors, setCreateDetailErrors] = useState<
    ExpenseRequestDetailFormErrors[]
  >([]);
  const [createDetailsError, setCreateDetailsError] = useState("");
  const [creatingExpenseRequest, setCreatingExpenseRequest] = useState(false);

  const userLookup = useMemo(() => mapUserLookup(users), [users]);

  const tripOptions = useMemo<SelectOption[]>(
    () =>
      tripOptionsData.map((trip) => ({
        value: String(trip.idTrip),
        label: buildTripOptionLabel(trip),
      })),
    [tripOptionsData]
  );

  const requesterOptions = useMemo<SelectOption[]>(
    () =>
      users.map((user) => ({
        value: String(user.userID),
        label:
          String(user.fullName ?? "").trim() ||
          String(user.userName ?? "").trim() ||
          String(user.userID),
      })),
    [users]
  );

  const conceptOptions = useMemo<SelectOption[]>(
    () =>
      concepts.map((concept) => ({
        value: String(concept.id),
        label: concept.label,
      })),
    [concepts]
  );

  const selectedTrip =
    tripOptions.find((option) => option.value === createFormValues.tripId) ??
    null;
  const selectedRequester =
    requesterOptions.find(
      (option) => option.value === createFormValues.requesterId
    ) ?? null;

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

  const fetchRequestCatalogs = useCallback(async () => {
    try {
      setLoadingCatalogs(true);

      const [tripsResponse, usersResponse, conceptsResponse] = await Promise.all([
        fetch(buildApiUrl("trips/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("users/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("concepts/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
      ]);

      const [tripsData, usersData, conceptsData] = await Promise.all([
        tripsResponse.json().catch(() => null),
        usersResponse.json().catch(() => null),
        conceptsResponse.json().catch(() => null),
      ]);

      if (!tripsResponse.ok || !tripsData?.success || !Array.isArray(tripsData?.data)) {
        throw new Error(tripsData?.message || t("Error loading expense request catalogs"));
      }

      if (!usersResponse.ok || !usersData?.success || !Array.isArray(usersData?.data)) {
        throw new Error(usersData?.message || t("Error loading expense request catalogs"));
      }

      if (
        !conceptsResponse.ok ||
        !conceptsData?.success ||
        !Array.isArray(conceptsData?.data)
      ) {
        throw new Error(
          conceptsData?.message || t("Error loading expense request catalogs")
        );
      }

      setTripOptionsData(
        (tripsData.data as any[])
          .map(mapExpenseRequestTrip)
          .filter((trip): trip is ExpenseRequestTrip => trip !== null)
      );
      setUsers(usersData.data as UserApiItem[]);
      setConcepts(
        (conceptsData.data as any[])
          .map(mapExpenseConceptReference)
          .filter(
            (concept): concept is ExpenseConceptReference => concept !== null
          )
      );
    } catch (catalogError: any) {
      setFeedback({
        type: "danger",
        message:
          catalogError?.message || t("Error loading expense request catalogs"),
      });
    } finally {
      setLoadingCatalogs(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("Requests")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchExpenseRequests();
    void fetchRequestCatalogs();
  }, [fetchExpenseRequests, fetchRequestCatalogs]);

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

  const handleOpenRequestModal = (request: ExpenseRequestItem) => {
    setSelectedRequest(request);
  };

  const handleCloseRequestModal = () => {
    setSelectedRequest(null);
  };

  const handleOpenCreateModal = () => {
    setCreateFormValues(
      createDefaultExpenseRequestForm(
        sessionUser.id !== null ? String(sessionUser.id) : ""
      )
    );
    setCreateFormErrors({});
    setCreateDetailErrors([]);
    setCreateDetailsError("");
    setIsCreateModalOpen(true);

    if (
      tripOptionsData.length === 0 ||
      users.length === 0 ||
      concepts.length === 0
    ) {
      void fetchRequestCatalogs();
    }
  };

  const handleCloseCreateModal = () => {
    if (creatingExpenseRequest) {
      return;
    }

    setCreateFormValues(
      createDefaultExpenseRequestForm(
        sessionUser.id !== null ? String(sessionUser.id) : ""
      )
    );
    setCreateFormErrors({});
    setCreateDetailErrors([]);
    setCreateDetailsError("");
    setIsCreateModalOpen(false);
  };

  const handleAddDetail = () => {
    setCreateFormValues((prev) => ({
      ...prev,
      details: [...prev.details, createEmptyExpenseRequestDetailForm()],
    }));
    setCreateDetailErrors((prev) => [...prev, {}]);
  };

  const handleRemoveDetail = (detailIndex: number) => {
    setCreateFormValues((prev) => ({
      ...prev,
      details: prev.details.filter((_, index) => index !== detailIndex),
    }));
    setCreateDetailErrors((prev) =>
      prev.filter((_, index) => index !== detailIndex)
    );
  };

  const getRequesterLabel = (request: ExpenseRequestItem) =>
    (request.requesterId !== null
      ? userLookup[request.requesterId]
      : undefined) ||
    request.requesterName ||
    "-";

  const handleCreateExpenseRequest = async (
    event?: React.FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();

    const validation = validateExpenseRequestForm(createFormValues, t);

    if (validation.hasErrors) {
      setCreateFormErrors(validation.formErrors);
      setCreateDetailErrors(validation.detailErrors);
      setCreateDetailsError(validation.detailsError);
      return;
    }

    if (sessionUser.id === null) {
      setFeedback({
        type: "danger",
        message: t(
          "Unable to identify the signed-in user to create this expense request."
        ),
      });
      return;
    }

    try {
      setCreatingExpenseRequest(true);
      setCreateFormErrors({});
      setCreateDetailErrors([]);
      setCreateDetailsError("");

      const response = await fetch(buildApiUrl("expense-requests/"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(
          buildExpenseRequestPayload(createFormValues, sessionUser.id)
        ),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t("Error creating expense request"));
      }

      await fetchExpenseRequests();
      setCurrentPage(1);
      setIsCreateModalOpen(false);
      setCreateFormValues(
        createDefaultExpenseRequestForm(
          sessionUser.id !== null ? String(sessionUser.id) : ""
        )
      );
      setFeedback({
        type: "success",
        message:
          data?.message || t("Expense request registered successfully."),
      });
    } catch (createError: any) {
      setFeedback({
        type: "danger",
        message:
          createError?.message || t("Error creating expense request"),
      });
    } finally {
      setCreatingExpenseRequest(false);
    }
  };

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

              <div className="d-flex flex-column flex-sm-row gap-2 flex-shrink-0">
                <Button color="primary" onClick={handleOpenCreateModal}>
                  <i className="ri-add-line align-bottom me-1" />
                  {t("New Expense")}
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
                    placeholder={t("Search requests...")}
                  />
                </InputGroup>
              </div>
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
                        paginatedRequests.map((request) => {
                          return (
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
                                  onClick={() => handleOpenRequestModal(request)}
                                >
                                  <i className="ri-eye-line" />
                                  <span>{t("View")}</span>
                                </Button>
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
        isOpen={isCreateModalOpen}
        toggle={creatingExpenseRequest ? undefined : handleCloseCreateModal}
        centered
        size="xl"
        backdrop={creatingExpenseRequest ? "static" : true}
        keyboard={!creatingExpenseRequest}
      >
        <ModalHeader
          toggle={creatingExpenseRequest ? undefined : handleCloseCreateModal}
        >
          {t("New Expense")}
        </ModalHeader>

        <Form onSubmit={handleCreateExpenseRequest}>
          <ModalBody className="p-4">
            {loadingCatalogs && (
              <div className="d-flex align-items-center gap-2 text-muted mb-3">
                <Spinner size="sm" />
                <span>{t("Loading...")}</span>
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Label className="form-label">
                  {t("Trip")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedTrip}
                  options={tripOptions}
                  onChange={(selected: SelectOption | null) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      tripId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select trip")}
                  isClearable
                  isSearchable
                  isDisabled={creatingExpenseRequest || loadingCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {createFormErrors.tripId && (
                  <div className="invalid-feedback d-block">
                    {createFormErrors.tripId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Request Number")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={createFormValues.requestNumber}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      requestNumber: event.target.value,
                    }))
                  }
                  invalid={Boolean(createFormErrors.requestNumber)}
                  placeholder="SV-2026-002"
                  disabled={creatingExpenseRequest}
                />
                <FormFeedback>{createFormErrors.requestNumber}</FormFeedback>
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Requested by")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedRequester}
                  options={requesterOptions}
                  onChange={(selected: SelectOption | null) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      requesterId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select requester")}
                  isClearable
                  isSearchable
                  isDisabled={creatingExpenseRequest || loadingCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {createFormErrors.requesterId && (
                  <div className="invalid-feedback d-block">
                    {createFormErrors.requesterId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Total Budget")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={createFormValues.totalBudget}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      totalBudget: event.target.value,
                    }))
                  }
                  invalid={Boolean(createFormErrors.totalBudget)}
                  placeholder="270.000"
                  disabled={creatingExpenseRequest}
                />
                <FormFeedback>{createFormErrors.totalBudget}</FormFeedback>
              </Col>

              <Col xs={12}>
                <Label className="form-label">
                  {t("Reason")} <span className="text-danger">*</span>
                </Label>
                <Input
                  type="textarea"
                  rows={3}
                  value={createFormValues.reason}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  invalid={Boolean(createFormErrors.reason)}
                  placeholder={t("Enter notes...")}
                  disabled={creatingExpenseRequest}
                />
                <FormFeedback>{createFormErrors.reason}</FormFeedback>
              </Col>
            </Row>

            <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
              <h6 className="mb-0">{t("Expense Details")}</h6>
              <Button
                color="light"
                type="button"
                className="d-inline-flex align-items-center gap-1"
                onClick={handleAddDetail}
                disabled={creatingExpenseRequest}
              >
                <i className="ri-add-line" />
                <span>{t("Add Detail")}</span>
              </Button>
            </div>

            {createDetailsError && (
              <div className="alert alert-danger py-2 mb-3">
                {createDetailsError}
              </div>
            )}

            <div className="d-flex flex-column gap-3">
              {createFormValues.details.map((detail, detailIndex) => {
                const detailError = createDetailErrors[detailIndex] || {};
                const selectedConcept =
                  conceptOptions.find(
                    (option) => option.value === detail.conceptId
                  ) ?? null;

                return (
                  <div
                    key={`expense-detail-${detailIndex}`}
                    className="border rounded-3 p-3"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="fw-semibold">
                        {t("Detail {{index}}", { index: detailIndex + 1 })}
                      </span>
                      <Button
                        color="danger"
                        type="button"
                        size="sm"
                        outline
                        onClick={() => handleRemoveDetail(detailIndex)}
                        disabled={
                          creatingExpenseRequest ||
                          createFormValues.details.length === 1
                        }
                      >
                        {t("Remove")}
                      </Button>
                    </div>

                    <Row className="g-3">
                      <Col md={4}>
                        <Label className="form-label">
                          {t("Concept")} <span className="text-danger">*</span>
                        </Label>
                        <Select
                          value={selectedConcept}
                          options={conceptOptions}
                          onChange={(selected: SelectOption | null) =>
                            setCreateFormValues((prev) => ({
                              ...prev,
                              details: prev.details.map((currentDetail, index) =>
                                index === detailIndex
                                  ? {
                                      ...currentDetail,
                                      conceptId: selected?.value ?? "",
                                    }
                                  : currentDetail
                              ),
                            }))
                          }
                          placeholder={t("Select concept")}
                          isClearable
                          isSearchable
                          isDisabled={creatingExpenseRequest || loadingCatalogs}
                          noOptionsMessage={() => t("No results")}
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                        {detailError.conceptId && (
                          <div className="invalid-feedback d-block">
                            {detailError.conceptId}
                          </div>
                        )}
                      </Col>

                      <Col md={3}>
                        <Label className="form-label">
                          {t("Budget")} <span className="text-danger">*</span>
                        </Label>
                        <Input
                          value={detail.budgetedAmount}
                          onChange={(event) =>
                            setCreateFormValues((prev) => ({
                              ...prev,
                              details: prev.details.map((currentDetail, index) =>
                                index === detailIndex
                                  ? {
                                      ...currentDetail,
                                      budgetedAmount: event.target.value,
                                    }
                                  : currentDetail
                              ),
                            }))
                          }
                          invalid={Boolean(detailError.budgetedAmount)}
                          placeholder="150.000"
                          disabled={creatingExpenseRequest}
                        />
                        <FormFeedback>{detailError.budgetedAmount}</FormFeedback>
                      </Col>

                      <Col md={5}>
                        <Label className="form-label">{t("Notes")}</Label>
                        <Input
                          value={detail.notes}
                          onChange={(event) =>
                            setCreateFormValues((prev) => ({
                              ...prev,
                              details: prev.details.map((currentDetail, index) =>
                                index === detailIndex
                                  ? {
                                      ...currentDetail,
                                      notes: event.target.value,
                                    }
                                  : currentDetail
                              ),
                            }))
                          }
                          placeholder={t("Enter notes...")}
                          disabled={creatingExpenseRequest}
                        />
                      </Col>
                    </Row>
                  </div>
                );
              })}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              color="light"
              type="button"
              onClick={handleCloseCreateModal}
              disabled={creatingExpenseRequest}
            >
              {t("Cancel")}
            </Button>
            <Button
              color="primary"
              type="submit"
              disabled={creatingExpenseRequest}
            >
              {creatingExpenseRequest && <Spinner size="sm" className="me-2" />}
              <i className="ri-save-line align-bottom me-1" />
              {t("Register")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal
        isOpen={selectedRequest !== null}
        toggle={handleCloseRequestModal}
        centered
        size="lg"
      >
        <ModalHeader toggle={handleCloseRequestModal}>
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
          <Button color="light" onClick={handleCloseRequestModal}>
            {t("Close")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default RequestsPage;
