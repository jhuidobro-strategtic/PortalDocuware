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
  expenseDetailId: string;
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
    expenseDetailId: "",
    conceptId: "",
    budgetedAmount: "",
    notes: "",
  });

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(parsedValue);
};

const formatBudgetAmount = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);

const normalizeBudgetInputValue = (value: string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? String(parsedValue) : value;
};

const parseAmount = (value: string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const buildTripOptionLabel = (trip: ExpenseRequestTrip) =>
  [
    trip.tripNumber || `#${trip.idTrip}`,
    `${trip.origin?.label || "-"} -> ${trip.destination?.label || "-"}`,
  ].join(" - ");

const mapRequestToFormValues = (
  request: ExpenseRequestItem
): ExpenseRequestFormValues => ({
  tripId: request.trip ? String(request.trip.idTrip) : "",
  requestNumber: request.requestNumber,
  requesterId: request.requesterId !== null ? String(request.requesterId) : "",
  reason: request.reason,
  totalBudget: normalizeBudgetInputValue(request.totalBudget),
  details:
    request.details.length > 0
      ? request.details.map((detail) => ({
          expenseDetailId: String(detail.expenseDetailId || ""),
          conceptId: detail.concept ? String(detail.concept.id) : "",
          budgetedAmount: normalizeBudgetInputValue(detail.budgetedAmount),
          notes: detail.notes,
        }))
      : [createEmptyExpenseRequestDetailForm()],
});

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

  const hasBudgetFieldErrors = detailErrors.some(
    (detail) => Boolean(detail.budgetedAmount)
  );

  if (
    !formErrors.totalBudget &&
    !hasBudgetFieldErrors &&
    values.details.length > 0
  ) {
    const detailsBudgetTotal = values.details.reduce(
      (acc, detail) => acc + parseAmount(detail.budgetedAmount),
      0
    );
    const totalBudgetAmount = parseAmount(values.totalBudget);

    if (detailsBudgetTotal > totalBudgetAmount) {
      detailsError = t(
        "The sum of expense detail budgets ({{detailsTotal}}) cannot exceed Total Budget ({{totalBudget}}).",
        {
          detailsTotal: formatBudgetAmount(detailsBudgetTotal),
          totalBudget: formatBudgetAmount(totalBudgetAmount),
        }
      );
    }
  }

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

const buildExpenseRequestUpdatePayload = (
  requestId: number,
  values: ExpenseRequestFormValues,
  userId: number
) => ({
  id_request: requestId,
  id_trip: Number(values.tripId),
  request_number: values.requestNumber.trim(),
  requester_name: Number(values.requesterId),
  reason: values.reason.trim(),
  total_budget: values.totalBudget.trim(),
  details: values.details.map((detail) => ({
    expense_detail_id: detail.expenseDetailId
      ? Number(detail.expenseDetailId)
      : undefined,
    id_concept: Number(detail.conceptId),
    budgeted_amount: detail.budgetedAmount.trim(),
    notes: detail.notes.trim(),
    created_by: userId,
  })),
});

const renderBudgetDetailPreview = (details: ExpenseRequestDetail[]) => {
  if (details.length === 0) {
    return <span className="text-muted">-</span>;
  }

  return (
    <div className="d-flex flex-column gap-1">
      {details.map((detail) => (
        <div key={detail.expenseDetailId} className="small text-wrap">
          <span className="fw-semibold">{detail.concept?.label || "-"}</span>
          <span className="text-muted">: {formatAmount(detail.budgetedAmount)}</span>
        </div>
      ))}
    </div>
  );
};

const RequestsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [editingRequest, setEditingRequest] =
    useState<ExpenseRequestItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormValues, setEditFormValues] = useState<ExpenseRequestFormValues>(
    {
      tripId: "",
      requestNumber: "",
      requesterId: "",
      reason: "",
      totalBudget: "",
      details: [createEmptyExpenseRequestDetailForm()],
    }
  );
  const [editFormErrors, setEditFormErrors] =
    useState<ExpenseRequestFormErrors>({});
  const [editDetailErrors, setEditDetailErrors] = useState<
    ExpenseRequestDetailFormErrors[]
  >([]);
  const [editDetailsError, setEditDetailsError] = useState("");
  const [updatingRequest, setUpdatingRequest] = useState(false);

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

  const selectedEditTrip =
    tripOptions.find((option) => option.value === editFormValues.tripId) ?? null;
  const selectedEditRequester =
    requesterOptions.find(
      (option) => option.value === editFormValues.requesterId
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

  const fetchRequestCatalogs = useCallback(async () => {
    try {
      setLoadingCatalogs(true);

      const [tripsResponse, conceptsResponse] = await Promise.all([
        fetch(buildApiUrl("trips/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("concepts/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
      ]);

      const [tripsData, conceptsData] = await Promise.all([
        tripsResponse.json().catch(() => null),
        conceptsResponse.json().catch(() => null),
      ]);

      if (!tripsResponse.ok || !tripsData?.success || !Array.isArray(tripsData?.data)) {
        throw new Error(tripsData?.message || t("Error loading expense request catalogs"));
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
    void Promise.all([fetchExpenseRequests(), fetchUsers(), fetchRequestCatalogs()]);
  }, [fetchExpenseRequests, fetchRequestCatalogs, fetchUsers]);

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

  const handleOpenEditModal = (request: ExpenseRequestItem) => {
    setEditingRequest(request);
    setEditFormValues(mapRequestToFormValues(request));
    setEditFormErrors({});
    setEditDetailErrors([]);
    setEditDetailsError("");
    setIsEditModalOpen(true);

    if (tripOptionsData.length === 0 || concepts.length === 0 || users.length === 0) {
      void Promise.all([fetchRequestCatalogs(), fetchUsers()]);
    }
  };

  const handleCloseEditModal = () => {
    if (updatingRequest) {
      return;
    }

    setEditingRequest(null);
    setEditFormValues({
      tripId: "",
      requestNumber: "",
      requesterId: "",
      reason: "",
      totalBudget: "",
      details: [createEmptyExpenseRequestDetailForm()],
    });
    setEditFormErrors({});
    setEditDetailErrors([]);
    setEditDetailsError("");
    setIsEditModalOpen(false);
  };

  const getRequesterLabel = (request: ExpenseRequestItem) =>
    (request.requesterId !== null
      ? userLookup[request.requesterId]
      : undefined) ||
    request.requesterName ||
    "-";

  const handleAddEditDetail = () => {
    setEditFormValues((prev) => ({
      ...prev,
      details: [...prev.details, createEmptyExpenseRequestDetailForm()],
    }));
    setEditDetailErrors((prev) => [...prev, {}]);
  };

  const handleRemoveEditDetail = (detailIndex: number) => {
    setEditFormValues((prev) => ({
      ...prev,
      details: prev.details.filter((_, index) => index !== detailIndex),
    }));
    setEditDetailErrors((prev) =>
      prev.filter((_, index) => index !== detailIndex)
    );
  };

  const handleUpdateExpenseRequest = async (
    event?: React.FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();

    if (!editingRequest) {
      return;
    }

    const validation = validateExpenseRequestForm(editFormValues, t);

    if (validation.hasErrors) {
      setEditFormErrors(validation.formErrors);
      setEditDetailErrors(validation.detailErrors);
      setEditDetailsError(validation.detailsError);
      if (validation.detailsError) {
        setFeedback({
          type: "danger",
          message: validation.detailsError,
        });
      }
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
      setUpdatingRequest(true);
      setEditFormErrors({});
      setEditDetailErrors([]);
      setEditDetailsError("");

      const response = await fetch(buildApiUrl("expense-requests/"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(
          buildExpenseRequestUpdatePayload(
            editingRequest.idRequest,
            editFormValues,
            sessionUser.id
          )
        ),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t("Error creating expense request"));
      }

      await fetchExpenseRequests();
      handleCloseEditModal();
      setFeedback({
        type: "success",
        message: data?.message || t("Expense request updated successfully."),
      });
    } catch (updateError: any) {
      setFeedback({
        type: "danger",
        message:
          updateError?.message || t("Error updating expense request"),
      });
    } finally {
      setUpdatingRequest(false);
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
                        <th style={{ width: "150px" }}>{t("Total Budget")}</th>
                        <th style={{ minWidth: "280px" }}>{t("Budget Detail")}</th>
                        <th style={{ width: "130px" }}>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4">
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
                              <td className="fw-semibold">
                                {formatAmount(request.totalBudget)}
                              </td>
                              <td
                                className="text-wrap"
                                style={{ whiteSpace: "normal" }}
                              >
                                {renderBudgetDetailPreview(request.details)}
                              </td>
                              <td className="text-center">
                                <TableActionsMenu
                                  items={[
                                    {
                                      id: `view-request-${request.idRequest}`,
                                      label: t("View"),
                                      icon: "ri-eye-line",
                                      tone: "neutral",
                                      onClick: () => setSelectedRequest(request),
                                    },
                                    {
                                      id: `edit-request-${request.idRequest}`,
                                      label: t("Edit"),
                                      icon: "ri-edit-line",
                                      tone: "neutral",
                                      onClick: () => handleOpenEditModal(request),
                                    },
                                    {
                                      id: `add-anticipo-${request.idRequest}`,
                                      label: t("Generar Anticipo"),
                                      icon: "ri-file-add-line",
                                      tone: "primary",
                                      onClick: () => navigate(`/travel-expenses/requests/${request.idRequest}/add-anticipo`),
                                    },
                                  ]}
                                />
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
        isOpen={isEditModalOpen}
        toggle={updatingRequest ? undefined : handleCloseEditModal}
        centered
        size="xl"
        backdrop={updatingRequest ? "static" : true}
        keyboard={!updatingRequest}
      >
        <ModalHeader
          toggle={updatingRequest ? undefined : handleCloseEditModal}
        >
          {t("Edit")}
        </ModalHeader>
        <Form onSubmit={handleUpdateExpenseRequest}>
          <ModalBody className="p-4">
            {loadingCatalogs && (
              <div className="d-flex align-items-center gap-2 text-muted mb-3">
                <Spinner size="sm" />
                <span>{t("Loading...")}</span>
              </div>
            )}

            {editFormErrors.tripId && (
              <div className="alert alert-danger py-2 mb-3">
                {editFormErrors.tripId}
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Label className="form-label">
                  {t("Trip")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedEditTrip}
                  options={tripOptions}
                  onChange={(selected: SelectOption | null) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      tripId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select trip")}
                  isClearable
                  isSearchable
                  isDisabled={updatingRequest || loadingCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Request Number")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={editFormValues.requestNumber}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      requestNumber: event.target.value,
                    }))
                  }
                  invalid={Boolean(editFormErrors.requestNumber)}
                  disabled={updatingRequest}
                />
                <FormFeedback>{editFormErrors.requestNumber}</FormFeedback>
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Requested by")} <span className="text-danger">*</span>
                </Label>
                <Select
                  value={selectedEditRequester}
                  options={requesterOptions}
                  onChange={(selected: SelectOption | null) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      requesterId: selected?.value ?? "",
                    }))
                  }
                  placeholder={t("Select requester")}
                  isClearable
                  isSearchable
                  isDisabled={updatingRequest || loadingCatalogs}
                  noOptionsMessage={() => t("No results")}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {editFormErrors.requesterId && (
                  <div className="invalid-feedback d-block">
                    {editFormErrors.requesterId}
                  </div>
                )}
              </Col>

              <Col md={6}>
                <Label className="form-label">
                  {t("Total Budget")} <span className="text-danger">*</span>
                </Label>
                <Input
                  value={editFormValues.totalBudget}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      totalBudget: event.target.value,
                    }))
                  }
                  invalid={Boolean(editFormErrors.totalBudget)}
                  disabled={updatingRequest}
                />
                <FormFeedback>{editFormErrors.totalBudget}</FormFeedback>
              </Col>

              <Col xs={12}>
                <Label className="form-label">
                  {t("Reason")} <span className="text-danger">*</span>
                </Label>
                <Input
                  type="textarea"
                  rows={3}
                  value={editFormValues.reason}
                  onChange={(event) =>
                    setEditFormValues((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  invalid={Boolean(editFormErrors.reason)}
                  placeholder={t("Enter notes...")}
                  disabled={updatingRequest}
                />
                <FormFeedback>{editFormErrors.reason}</FormFeedback>
              </Col>
            </Row>

            <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
              <h6 className="mb-0">{t("Expense Details")}</h6>
              <Button
                color="light"
                type="button"
                className="d-inline-flex align-items-center gap-1"
                onClick={handleAddEditDetail}
                disabled={updatingRequest}
              >
                <i className="ri-add-line" />
                <span>{t("Add Detail")}</span>
              </Button>
            </div>

            <div className="d-flex flex-column gap-3">
              {editFormValues.details.map((detail, detailIndex) => {
                const detailError = editDetailErrors[detailIndex] || {};
                const selectedConcept =
                  conceptOptions.find(
                    (option) => option.value === detail.conceptId
                  ) ?? null;

                return (
                  <div
                    key={`edit-expense-detail-${detailIndex}`}
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
                        onClick={() => handleRemoveEditDetail(detailIndex)}
                        disabled={
                          updatingRequest || editFormValues.details.length === 1
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
                            setEditFormValues((prev) => ({
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
                          isDisabled={updatingRequest || loadingCatalogs}
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
                            setEditFormValues((prev) => ({
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
                          disabled={updatingRequest}
                        />
                        <FormFeedback>{detailError.budgetedAmount}</FormFeedback>
                      </Col>

                      <Col md={5}>
                        <Label className="form-label">{t("Notes")}</Label>
                        <Input
                          value={detail.notes}
                          onChange={(event) =>
                            setEditFormValues((prev) => ({
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
                          disabled={updatingRequest}
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
              onClick={handleCloseEditModal}
              disabled={updatingRequest}
            >
              {t("Cancel")}
            </Button>
            <Button color="primary" type="submit" disabled={updatingRequest}>
              {updatingRequest && <Spinner size="sm" className="me-2" />}
              <i className="ri-save-line align-bottom me-1" />
              {t("Update")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

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
