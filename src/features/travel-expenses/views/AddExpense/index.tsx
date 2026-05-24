import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  Label,
  Row,
  Spinner,
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

interface UserApiItem {
  userID: number;
  userName?: string;
  fullName?: string;
}

interface SessionUser {
  id: number | null;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
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

const createExpenseRequestForm = (
  requesterId = "",
  tripId = ""
): ExpenseRequestFormValues => ({
  tripId,
  requestNumber: "",
  requesterId,
  reason: "",
  totalBudget: "",
  details: [createEmptyExpenseRequestDetailForm()],
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

const AddExpensePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const sessionUser = getCurrentSessionUser();
  const lockedTripId = /^\d+$/.test(tripId || "") ? String(tripId) : "";
  const requesterId = sessionUser.id !== null ? String(sessionUser.id) : "";
  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  const [tripOptionsData, setTripOptionsData] = useState<ExpenseRequestTrip[]>(
    []
  );
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [concepts, setConcepts] = useState<ExpenseConceptReference[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [creatingExpenseRequest, setCreatingExpenseRequest] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [createFormValues, setCreateFormValues] =
    useState<ExpenseRequestFormValues>(
      createExpenseRequestForm(requesterId, lockedTripId)
    );
  const [createFormErrors, setCreateFormErrors] =
    useState<ExpenseRequestFormErrors>({});
  const [createDetailErrors, setCreateDetailErrors] = useState<
    ExpenseRequestDetailFormErrors[]
  >([]);
  const [createDetailsError, setCreateDetailsError] = useState("");

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
    tripOptionsData.find(
      (trip) => String(trip.idTrip) === createFormValues.tripId
    ) ?? null;
  const selectedRequester =
    requesterOptions.find(
      (option) => option.value === createFormValues.requesterId
    ) ?? null;

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
          .filter((item): item is ExpenseRequestTrip => item !== null)
      );
      setUsers(usersData.data as UserApiItem[]);
      setConcepts(
        (conceptsData.data as any[])
          .map(mapExpenseConceptReference)
          .filter(
            (item): item is ExpenseConceptReference => item !== null
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
    document.title = `${t("Add Expense")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchRequestCatalogs();
  }, [fetchRequestCatalogs]);

  useEffect(() => {
    if (!lockedTripId) {
      return;
    }

    setCreateFormValues((prev) =>
      prev.tripId === lockedTripId
        ? prev
        : {
            ...prev,
            tripId: lockedTripId,
          }
    );
  }, [lockedTripId]);

  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "add-expense-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "add-expense-feedback") {
      setFeedback(null);
    }
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

      navigate("/travel-expenses/requests", { replace: true });
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

        <BreadCrumb title="Add Expense" pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("Add Expense")}</h5>
                {selectedTrip && (
                  <p className="text-muted mb-0">
                    {buildTripOptionLabel(selectedTrip)}
                  </p>
                )}
              </div>

              <Button
                color="light"
                type="button"
                onClick={() => navigate("/travel-expenses/trips")}
              >
                <i className="ri-arrow-left-line align-bottom me-1" />
                {t("Back")}
              </Button>
            </div>

            <Form onSubmit={handleCreateExpenseRequest}>
              {loadingCatalogs && (
                <div className="d-flex align-items-center gap-2 text-muted mb-3">
                  <Spinner size="sm" />
                  <span>{t("Loading...")}</span>
                </div>
              )}

              {createFormErrors.tripId && (
                <div className="alert alert-danger py-2 mb-3">
                  {createFormErrors.tripId}
                </div>
              )}

              <Row className="g-3">
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
                    menuPortalTarget={menuPortalTarget}
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
                                details: prev.details.map(
                                  (currentDetail, index) =>
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
                            menuPortalTarget={menuPortalTarget}
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
                                details: prev.details.map(
                                  (currentDetail, index) =>
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
                          <FormFeedback>
                            {detailError.budgetedAmount}
                          </FormFeedback>
                        </Col>

                        <Col md={5}>
                          <Label className="form-label">{t("Notes")}</Label>
                          <Input
                            value={detail.notes}
                            onChange={(event) =>
                              setCreateFormValues((prev) => ({
                                ...prev,
                                details: prev.details.map(
                                  (currentDetail, index) =>
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

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button
                  color="light"
                  type="button"
                  onClick={() => navigate("/travel-expenses/trips")}
                  disabled={creatingExpenseRequest}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  disabled={creatingExpenseRequest}
                >
                  {creatingExpenseRequest && (
                    <Spinner size="sm" className="me-2" />
                  )}
                  <i className="ri-save-line align-bottom me-1" />
                  {t("Register")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default AddExpensePage;
