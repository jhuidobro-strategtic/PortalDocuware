import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
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

interface ExpenseRequestTrip {
  idTrip: number;
  tripNumber: string;
  vehicle: TripReference | null;
  driver: TripReference | null;
  driverId?: number;
  origin: TripReference | null;
  destination: TripReference | null;
  departureDate: string;
  returnDate: string;
  configurationId?: number;
  configurationCode?: string;
  configurationName?: string;
  axleCount?: number;
  trailerCount?: number;
  tractoPlate?: string;
  trailerPlates?: string[];
}

interface ExpenseConceptReference {
  id: number;
  label: string;
}

export interface TripExpenseRule {
  id_rule: number;
  id_concept: number;
  concept?: {
    id_concept: number;
    nombre_concepto: string;
  };
  calculation_type: "FIXED" | "PER_AXLE" | "PER_DAY" | "PER_NIGHT" | "MANUAL" | string;
  unit_amount: string;
  is_active: boolean;
  notes?: string;
}

export const CALCULATION_TYPES = [
  { value: "FIXED", label: "Fijo", badgeClass: "bg-primary-subtle text-primary border border-primary-subtle" },
  { value: "PER_AXLE", label: "Por eje", badgeClass: "bg-info-subtle text-info border border-info-subtle" },
  { value: "PER_DAY", label: "Por día", badgeClass: "bg-warning-subtle text-warning border border-warning-subtle" },
  { value: "PER_NIGHT", label: "Por noche", badgeClass: "bg-secondary-subtle text-secondary border border-secondary-subtle" },
  { value: "MANUAL", label: "Manual", badgeClass: "bg-dark-subtle text-dark border border-dark-subtle" },
];

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

export interface ExpenseRequestFormDetailValues {
  idExpenseDetail?: number;
  conceptId: string;
  calculationType: string;
  quantity: string;
  unitAmount: string;
  budgetedAmount: string;
  notes: string;
}

export interface ExpenseRequestFormValues {
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
    height: "38px",
  }),
  valueContainer: (base: Record<string, unknown>) => ({
    ...base,
    height: "38px",
    padding: "0 8px",
  }),
  indicatorsContainer: (base: Record<string, unknown>) => ({
    ...base,
    height: "38px",
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

const createEmptyExpenseRequestDetailForm = (
  calculationType = "MANUAL",
  quantity = "1",
  unitAmount = "",
  budgetedAmount = "",
  notes = ""
): ExpenseRequestFormDetailValues => ({
  conceptId: "",
  calculationType,
  quantity,
  unitAmount,
  budgetedAmount,
  notes,
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

  const driverId = Number(
    item.driver?.idconductor ??
      item.driver?.userID ??
      item.driver_id ??
      0
  );
  const driverName = String(
    item.driver?.conductor_nm ??
      item.driver?.fullName ??
      item.driver?.userName ??
      ""
  ).trim();

  const driverRef: TripReference | null =
    driverId || driverName ? { id: driverId, label: driverName } : null;

  const trailerUnits = Array.isArray(item.units)
    ? item.units
        .filter(
          (u: any) =>
            u.unit_type === "REMOLQUE" ||
            u.unit_type === "SEMIRREMOLQUE" ||
            (u.position != null && u.position > 0)
        )
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    : [];

  const trailerPlates = trailerUnits
    .map((u: any) => {
      if (u.vehicle?.no_vehiculo) return String(u.vehicle.no_vehiculo).trim();
      if (u.no_vehiculo) return String(u.no_vehiculo).trim();
      return "";
    })
    .filter(Boolean);

  const tractoUnit = Array.isArray(item.units)
    ? item.units.find(
        (u: any) => u.unit_type === "TRACTO" || u.position === 0
      )
    : null;

  const tractoPlate = String(
    item.vehicle?.no_vehiculo ||
      tractoUnit?.vehicle?.no_vehiculo ||
      tractoUnit?.no_vehiculo ||
      ""
  ).trim();

  return {
    idTrip: Number(item.id_trip ?? 0),
    tripNumber: String(item.trip_number ?? "").trim(),
    vehicle:
      mapTripReference(item.vehicle, "idvehiculo", "no_vehiculo") ||
      (tractoPlate ? { id: Number(item.vehicle_id || 0), label: tractoPlate } : null),
    driver: driverRef,
    driverId: driverId || undefined,
    origin:
      mapTripReference(item.origin_data, "idorigen", "nombre_origen") ||
      (item.origin ? { id: Number(item.origin), label: "" } : null),
    destination:
      mapTripReference(item.destination_data, "idorigen", "nombre_origen") ||
      (item.destination ? { id: Number(item.destination), label: "" } : null),
    departureDate: String(item.departure_date ?? "").trim(),
    returnDate: String(item.return_date ?? "").trim(),
    configurationId:
      Number(
        item.configuration_id ??
          item.configuration_data?.id_configuration ??
          0
      ) || undefined,
    configurationCode: String(
      item.configuration_data?.code ?? item.configuration_code ?? ""
    ).trim(),
    configurationName: String(item.configuration_data?.name ?? "").trim(),
    axleCount:
      Number(item.configuration_data?.axle_count ?? 0) || undefined,
    trailerCount:
      Number(item.configuration_data?.trailer_count ?? 0) || undefined,
    tractoPlate,
    trailerPlates,
  };
};

const buildTripOptionLabel = (trip: ExpenseRequestTrip) =>
  [
    trip.tripNumber || `#${trip.idTrip}`,
    trip.configurationCode ? `[${trip.configurationCode}]` : "",
    `${trip.origin?.label || "-"} ➔ ${trip.destination?.label || "-"}`,
  ]
    .filter(Boolean)
    .join(" - ");

const parseAmount = (value: string | number) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const formatBudgetAmount = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value);

const formatDateTime = (value: string) => {
  const parsedDate = moment(value, moment.ISO_8601, true);
  return parsedDate.isValid() ? parsedDate.format("DD/MM/YYYY HH:mm") : "-";
};

const calculateTripNights = (
  departureDate?: string,
  returnDate?: string
): number => {
  if (!departureDate || !returnDate) return 1;
  const start = moment(departureDate);
  const end = moment(returnDate);
  if (start.isValid() && end.isValid()) {
    const diff = end.diff(start, "days");
    return Math.max(1, diff);
  }
  return 1;
};

const calculateTripDays = (
  departureDate?: string,
  returnDate?: string
): number => {
  if (!departureDate || !returnDate) return 1;
  const start = moment(departureDate);
  const end = moment(returnDate);
  if (start.isValid() && end.isValid()) {
    const diff = Math.ceil(end.diff(start, "hours") / 24);
    return Math.max(1, diff);
  }
  return 1;
};

const validateExpenseRequestForm = (
  values: ExpenseRequestFormValues,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  const formErrors: ExpenseRequestFormErrors = {};
  const detailErrors: ExpenseRequestDetailFormErrors[] = values.details.map(
    () => ({})
  );
  let detailsError = "";
  const totalBudgetAmount = parseAmount(values.totalBudget);

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
    calculation_type: detail.calculationType || "MANUAL",
    quantity: detail.quantity ? String(detail.quantity) : "1",
    unit_amount: detail.unitAmount
      ? String(detail.unitAmount)
      : detail.budgetedAmount,
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
  const initialRequesterId =
    sessionUser.id !== null ? String(sessionUser.id) : "";
  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  const [tripOptionsData, setTripOptionsData] = useState<ExpenseRequestTrip[]>(
    []
  );
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [concepts, setConcepts] = useState<ExpenseConceptReference[]>([]);
  const [expenseRules, setExpenseRules] = useState<TripExpenseRule[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [creatingExpenseRequest, setCreatingExpenseRequest] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [createFormValues, setCreateFormValues] =
    useState<ExpenseRequestFormValues>(
      createExpenseRequestForm(initialRequesterId, lockedTripId)
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

  const selectedTrip = useMemo(
    () =>
      tripOptionsData.find(
        (trip) => String(trip.idTrip) === createFormValues.tripId
      ) ?? null,
    [tripOptionsData, createFormValues.tripId]
  );

  const selectedRequester = useMemo(
    () =>
      requesterOptions.find(
        (option) => option.value === createFormValues.requesterId
      ) ?? null,
    [requesterOptions, createFormValues.requesterId]
  );

  const fetchRequestCatalogs = useCallback(async () => {
    try {
      setLoadingCatalogs(true);

      const [
        tripsResponse,
        usersResponse,
        conceptsResponse,
        rulesResponse,
        existingRequestsResponse,
      ] = await Promise.all([
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
        fetch(buildApiUrl("trip-expense-rules/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(buildApiUrl("expense-requests/"), {
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
      ]);

      const [
        tripsData,
        usersData,
        conceptsData,
        rulesData,
        existingRequestsData,
      ] = await Promise.all([
        tripsResponse.json().catch(() => null),
        usersResponse.json().catch(() => null),
        conceptsResponse.json().catch(() => null),
        rulesResponse.json().catch(() => null),
        existingRequestsResponse ? existingRequestsResponse.json().catch(() => null) : null,
      ]);

      if (
        !tripsResponse.ok ||
        !tripsData?.success ||
        !Array.isArray(tripsData?.data)
      ) {
        throw new Error(
          tripsData?.message || t("Error loading expense request catalogs")
        );
      }

      if (
        !usersResponse.ok ||
        !usersData?.success ||
        !Array.isArray(usersData?.data)
      ) {
        throw new Error(
          usersData?.message || t("Error loading expense request catalogs")
        );
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

      let parsedTrips = (tripsData.data as any[])
        .map(mapExpenseRequestTrip)
        .filter((item): item is ExpenseRequestTrip => item !== null);

      // If lockedTripId is provided and not in trips list, fetch it directly
      if (
        lockedTripId &&
        !parsedTrips.some((tr) => String(tr.idTrip) === lockedTripId)
      ) {
        try {
          const singleTripResp = await fetch(
            buildApiUrl(`trips/${lockedTripId}/`),
            {
              cache: "no-store",
              headers: getAuthHeaders(),
            }
          );
          const singleTripJson = await singleTripResp.json().catch(() => null);
          if (singleTripJson?.data) {
            const mappedSingle = mapExpenseRequestTrip(singleTripJson.data);
            if (mappedSingle) {
              parsedTrips = [mappedSingle, ...parsedTrips];
            }
          }
        } catch {
          // ignore single trip error fallback
        }
      }

      setTripOptionsData(parsedTrips);
      setUsers(usersData.data as UserApiItem[]);
      setConcepts(
        (conceptsData.data as any[])
          .map(mapExpenseConceptReference)
          .filter((item): item is ExpenseConceptReference => item !== null)
      );

      if (rulesData?.success && Array.isArray(rulesData.data)) {
        setExpenseRules(rulesData.data as TripExpenseRule[]);
      }

      // Check if an existing expense request already exists for the selected trip
      if (lockedTripId && existingRequestsData?.success && Array.isArray(existingRequestsData.data)) {
        const existingForTrip = existingRequestsData.data.find(
          (req: any) => String(req.id_trip) === lockedTripId
        );
        if (existingForTrip) {
          const mappedDetails: ExpenseRequestFormDetailValues[] =
            Array.isArray(existingForTrip.details) && existingForTrip.details.length > 0
              ? existingForTrip.details.map((d: any) => ({
                  idExpenseDetail: d.expense_detail_id,
                  conceptId: String(d.id_concept || d.concept?.id_concept || ""),
                  calculationType: String(d.calculation_type || "MANUAL").toUpperCase(),
                  quantity: String(d.quantity != null ? Number(d.quantity) : "1"),
                  unitAmount: String(d.unit_amount != null ? Number(d.unit_amount) : ""),
                  budgetedAmount: String(d.budgeted_amount != null ? Number(d.budgeted_amount) : ""),
                  notes: String(d.notes || ""),
                }))
              : [createEmptyExpenseRequestDetailForm()];

          setCreateFormValues((prev) => ({
            ...prev,
            tripId: lockedTripId,
            requestNumber: existingForTrip.request_number || prev.requestNumber,
            requesterId: String(existingForTrip.requester_name || prev.requesterId),
            reason: existingForTrip.reason || prev.reason,
            totalBudget: String(existingForTrip.total_budget || prev.totalBudget),
            details: mappedDetails,
          }));

          setFeedback({
            type: "info",
            message: t(
              "Existing expense request loaded for this trip ({{requestNumber}}). You can adjust values and save updates.",
              {
                requestNumber:
                  existingForTrip.request_number || `#${existingForTrip.id_request}`,
              }
            ),
          });
        }
      }
    } catch (catalogError: any) {
      setFeedback({
        type: "danger",
        message:
          catalogError?.message || t("Error loading expense request catalogs"),
      });
    } finally {
      setLoadingCatalogs(false);
    }
  }, [lockedTripId, t]);

  useEffect(() => {
    document.title = `${t("Add Expense")} | Docuware`;
  }, [t]);

  useEffect(() => {
    void fetchRequestCatalogs();
  }, [fetchRequestCatalogs]);

  // When selectedTrip changes, set default fields if empty
  useEffect(() => {
    if (!selectedTrip) return;

    setCreateFormValues((prev) => {
      const updates: Partial<ExpenseRequestFormValues> = {};
      if (!prev.requesterId && selectedTrip.driverId) {
        updates.requesterId = String(selectedTrip.driverId);
      }
      if (!prev.reason) {
        updates.reason = `Gastos para viaje ${selectedTrip.tripNumber || `#${selectedTrip.idTrip}`}`;
      }
      if (!prev.requestNumber) {
        const yy = String(new Date().getFullYear()).slice(-2);
        updates.requestNumber = `SG-${yy}-${String(selectedTrip.idTrip).padStart(4, "0")}`;
      }
      if (Object.keys(updates).length > 0) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, [selectedTrip]);

  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "add-expense-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 7000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "add-expense-feedback") {
      setFeedback(null);
    }
  };

  // Helper to update details and automatically recalculate total budget
  const updateDetailsAndRecalculateTotal = (
    nextDetails: ExpenseRequestFormDetailValues[]
  ) => {
    const sum = nextDetails.reduce(
      (acc, d) => acc + parseAmount(d.budgetedAmount),
      0
    );

    setCreateFormValues((prev) => ({
      ...prev,
      details: nextDetails,
      totalBudget: sum > 0 ? sum.toFixed(3) : prev.totalBudget,
    }));
  };

  // When a Concept is selected in a detail row
  const handleConceptChange = (
    detailIndex: number,
    newConceptId: string
  ) => {
    const nextDetails = [...createFormValues.details];
    const current = nextDetails[detailIndex];

    const matchingRule = expenseRules.find(
      (r) => String(r.id_concept) === newConceptId && r.is_active
    );

    if (matchingRule) {
      const calcType = matchingRule.calculation_type;
      const unitAmt = parseFloat(matchingRule.unit_amount) || 0;
      let qty = 1;

      if (calcType === "PER_AXLE") {
        qty = selectedTrip?.axleCount || 3;
      } else if (calcType === "PER_NIGHT") {
        qty = calculateTripNights(
          selectedTrip?.departureDate,
          selectedTrip?.returnDate
        );
      } else if (calcType === "PER_DAY") {
        qty = calculateTripDays(
          selectedTrip?.departureDate,
          selectedTrip?.returnDate
        );
      } else if (calcType === "FIXED") {
        qty = 1;
      }

      const budgeted = (qty * unitAmt).toFixed(3);
      const note = matchingRule.notes || current.notes;

      nextDetails[detailIndex] = {
        ...current,
        conceptId: newConceptId,
        calculationType: calcType,
        quantity: String(qty),
        unitAmount: String(unitAmt),
        budgetedAmount: budgeted,
        notes: note || "",
      };
    } else {
      nextDetails[detailIndex] = {
        ...current,
        conceptId: newConceptId,
        calculationType: current.calculationType || "MANUAL",
      };
    }

    updateDetailsAndRecalculateTotal(nextDetails);
  };

  // When Calculation Type is changed for a detail row
  const handleCalculationTypeChange = (
    detailIndex: number,
    newCalcType: string
  ) => {
    const nextDetails = [...createFormValues.details];
    const current = nextDetails[detailIndex];

    let qty = parseAmount(current.quantity) || 1;
    let unitAmt = parseAmount(current.unitAmount);

    const matchingRule = expenseRules.find(
      (r) => String(r.id_concept) === current.conceptId && r.is_active
    );
    if (
      matchingRule &&
      (!unitAmt || matchingRule.calculation_type === newCalcType)
    ) {
      unitAmt = parseFloat(matchingRule.unit_amount) || 0;
    }

    if (newCalcType === "PER_AXLE") {
      qty = selectedTrip?.axleCount || 3;
    } else if (newCalcType === "PER_NIGHT") {
      qty = calculateTripNights(
        selectedTrip?.departureDate,
        selectedTrip?.returnDate
      );
    } else if (newCalcType === "PER_DAY") {
      qty = calculateTripDays(
        selectedTrip?.departureDate,
        selectedTrip?.returnDate
      );
    } else if (newCalcType === "FIXED") {
      qty = 1;
    }

    const budgeted =
      newCalcType === "MANUAL"
        ? current.budgetedAmount
        : (qty * unitAmt).toFixed(3);

    nextDetails[detailIndex] = {
      ...current,
      calculationType: newCalcType,
      quantity: String(qty),
      unitAmount: unitAmt ? String(unitAmt) : current.unitAmount,
      budgetedAmount: budgeted,
    };

    updateDetailsAndRecalculateTotal(nextDetails);
  };

  const handleQuantityChange = (detailIndex: number, newQty: string) => {
    const nextDetails = [...createFormValues.details];
    const current = nextDetails[detailIndex];

    const qtyNum = parseAmount(newQty);
    const unitAmtNum = parseAmount(current.unitAmount);
    const budgeted =
      current.calculationType !== "MANUAL" && unitAmtNum > 0
        ? (qtyNum * unitAmtNum).toFixed(3)
        : current.budgetedAmount;

    nextDetails[detailIndex] = {
      ...current,
      quantity: newQty,
      budgetedAmount: budgeted,
    };

    updateDetailsAndRecalculateTotal(nextDetails);
  };

  const handleUnitAmountChange = (
    detailIndex: number,
    newUnitAmount: string
  ) => {
    const nextDetails = [...createFormValues.details];
    const current = nextDetails[detailIndex];

    const qtyNum = parseAmount(current.quantity) || 1;
    const unitAmtNum = parseAmount(newUnitAmount);
    const budgeted =
      current.calculationType !== "MANUAL"
        ? (qtyNum * unitAmtNum).toFixed(3)
        : current.budgetedAmount;

    nextDetails[detailIndex] = {
      ...current,
      unitAmount: newUnitAmount,
      budgetedAmount: budgeted,
    };

    updateDetailsAndRecalculateTotal(nextDetails);
  };

  const handleBudgetedAmountChange = (
    detailIndex: number,
    newBudget: string
  ) => {
    const nextDetails = [...createFormValues.details];
    nextDetails[detailIndex] = {
      ...nextDetails[detailIndex],
      budgetedAmount: newBudget,
    };

    updateDetailsAndRecalculateTotal(nextDetails);
  };

  const handleNotesChange = (detailIndex: number, newNotes: string) => {
    setCreateFormValues((prev) => ({
      ...prev,
      details: prev.details.map((d, idx) =>
        idx === detailIndex ? { ...d, notes: newNotes } : d
      ),
    }));
  };

  const handleAddDetail = () => {
    setCreateFormValues((prev) => ({
      ...prev,
      details: [...prev.details, createEmptyExpenseRequestDetailForm()],
    }));
    setCreateDetailErrors((prev) => [...prev, {}]);
  };

  const handleRemoveDetail = (detailIndex: number) => {
    const nextDetails = createFormValues.details.filter(
      (_, index) => index !== detailIndex
    );
    setCreateDetailErrors((prev) =>
      prev.filter((_, index) => index !== detailIndex)
    );
    updateDetailsAndRecalculateTotal(nextDetails);
  };

  // Auto-generate expenses using POST /api/expense-requests/auto-generate/
  const handleAutoGenerate = async () => {
    if (!createFormValues.tripId) {
      setFeedback({
        type: "danger",
        message: t("Please select a trip first."),
      });
      return;
    }

    try {
      setAutoGenerating(true);
      setFeedback(null);

      const requester = Number(
        createFormValues.requesterId ||
          selectedTrip?.driverId ||
          sessionUser.id ||
          7
      );
      const createdBy = Number(sessionUser.id || 7);

      const response = await fetch(
        buildApiUrl("expense-requests/auto-generate/"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id_trip: Number(createFormValues.tripId),
            requester_name: requester,
            created_by: createdBy,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t("Error generating expenses"));
      }

      const generatedData = data.data;

      setCreateFormValues((prev) => ({
        ...prev,
        requestNumber:
          generatedData.request_number ||
          `SG-${String(generatedData.id_request).padStart(5, "0")}`,
        requesterId: String(generatedData.requester_name || requester),
        reason: generatedData.reason || prev.reason,
        totalBudget: String(generatedData.total_budget || "0"),
        details:
          Array.isArray(generatedData.details) &&
          generatedData.details.length > 0
            ? generatedData.details.map((d: any) => ({
                idExpenseDetail: d.expense_detail_id,
                conceptId: String(d.id_concept || d.concept?.id_concept || ""),
                calculationType: String(
                  d.calculation_type || "MANUAL"
                ).toUpperCase(),
                quantity: String(
                  d.quantity != null ? Number(d.quantity) : "1"
                ),
                unitAmount: String(
                  d.unit_amount != null ? Number(d.unit_amount) : ""
                ),
                budgetedAmount: String(
                  d.budgeted_amount != null ? Number(d.budgeted_amount) : ""
                ),
                notes: String(d.notes || ""),
              }))
            : prev.details,
      }));

      setFeedback({
        type: "success",
        message: t(
          "Expenses auto-generated successfully using trip rules (Total: S/. {{total}}). You can adjust any value before saving.",
          { total: generatedData.total_budget || "0.00" }
        ),
      });
    } catch (err: any) {
      setFeedback({
        type: "danger",
        message: err?.message || t("Error auto-generating expenses"),
      });
    } finally {
      setAutoGenerating(false);
    }
  };

  // Submit adjustments via POST /api/expense-requests/
  const handleCreateExpenseRequest = async (
    event?: React.FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();

    const validation = validateExpenseRequestForm(createFormValues, t);

    if (validation.hasErrors) {
      setCreateFormErrors(validation.formErrors);
      setCreateDetailErrors(validation.detailErrors);
      setCreateDetailsError(validation.detailsError);
      if (validation.detailsError) {
        setFeedback({
          type: "danger",
          message: validation.detailsError,
        });
      }
      return;
    }

    const createdById = sessionUser.id ?? 7;

    try {
      setCreatingExpenseRequest(true);
      setCreateFormErrors({});
      setCreateDetailErrors([]);
      setCreateDetailsError("");

      const response = await fetch(buildApiUrl("expense-requests/"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(
          buildExpenseRequestPayload(createFormValues, createdById)
        ),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || t("Error creating/adjusting expense request")
        );
      }

      navigate("/travel-expenses/requests", {
        replace: true,
        state: {
          type: "success",
          message: t(
            "Expense request successfully saved ({{requestNumber}}).",
            {
              requestNumber:
                data.data?.request_number ||
                createFormValues.requestNumber,
            }
          ),
        },
      });
    } catch (createError: any) {
      setFeedback({
        type: "danger",
        message:
          createError?.message ||
          t("Error creating/adjusting expense request"),
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
                <p className="text-muted mb-0">
                  {t("Register and manage expenses for this trip.")}
                </p>
              </div>

              <div className="d-flex gap-2">
                <Button
                  color="light"
                  type="button"
                  onClick={() => navigate("/travel-expenses/trips")}
                >
                  <i className="ri-arrow-left-line align-bottom me-1" />
                  {t("Back")}
                </Button>
              </div>
            </div>

            {/* Selected Trip Details Card */}
            {selectedTrip && (
              <Card className="bg-light border mb-4">
                <CardBody className="p-3">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="fw-bold text-dark fs-6">
                          {selectedTrip.tripNumber || `#${selectedTrip.idTrip}`}
                        </span>
                        {selectedTrip.configurationCode && (
                          <Badge color="primary" className="font-size-12">
                            {selectedTrip.configurationCode} ·{" "}
                            {selectedTrip.configurationName || `${selectedTrip.axleCount || 0} ejes`}
                          </Badge>
                        )}
                        <span className="text-muted">|</span>
                        <span className="fw-medium text-dark">
                          <i className="ri-truck-line text-primary me-1" />
                          Tracto: {selectedTrip.tractoPlate || selectedTrip.vehicle?.label || "-"}
                        </span>
                        {selectedTrip.trailerPlates && selectedTrip.trailerPlates.length > 0 && (
                          <span className="badge bg-white text-secondary border">
                            <i className="ri-roadster-line me-1" />
                            {selectedTrip.trailerPlates.map((p, idx) => `R${idx + 1}: ${p}`).join(", ")}
                          </span>
                        )}
                      </div>

                      <div className="d-flex flex-wrap gap-3 text-muted font-size-13 mt-2">
                        <div>
                          <i className="ri-map-pin-line text-danger me-1" />
                          <strong>Ruta:</strong> {selectedTrip.origin?.label || "-"} ➔ {selectedTrip.destination?.label || "-"}
                        </div>
                        <div>
                          <i className="ri-calendar-event-line text-info me-1" />
                          <strong>Fechas:</strong> {formatDateTime(selectedTrip.departureDate)} ➔ {formatDateTime(selectedTrip.returnDate)}
                        </div>
                        <div>
                          <i className="ri-time-line text-warning me-1" />
                          <strong>Duración:</strong> {calculateTripDays(selectedTrip.departureDate, selectedTrip.returnDate)} día(s) / {calculateTripNights(selectedTrip.departureDate, selectedTrip.returnDate)} noche(s)
                        </div>
                        {selectedTrip.driver && (
                          <div>
                            <i className="ri-user-line text-success me-1" />
                            <strong>Conductor:</strong> {selectedTrip.driver.label}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Button
                        color="warning"
                        type="button"
                        onClick={handleAutoGenerate}
                        disabled={autoGenerating || creatingExpenseRequest}
                        className="d-inline-flex align-items-center gap-1 text-white fw-medium shadow-sm"
                      >
                        {autoGenerating ? (
                          <Spinner size="sm" className="me-1 text-white" />
                        ) : (
                          <i className="ri-calculator-line fs-5" />
                        )}
                        <span>{t("Autogenerar gastos con reglas")}</span>
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            <Form onSubmit={handleCreateExpenseRequest}>
              {loadingCatalogs && (
                <div className="d-flex align-items-center gap-2 text-muted mb-3">
                  <Spinner size="sm" />
                  <span>{t("Loading catalogs...")}</span>
                </div>
              )}

              {createFormErrors.tripId && (
                <div className="alert alert-danger py-2 mb-3">
                  {createFormErrors.tripId}
                </div>
              )}

              <Row className="g-3 mb-4">
                <Col md={3}>
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
                    placeholder="SG-26-0001"
                    disabled={creatingExpenseRequest}
                  />
                  <FormFeedback>{createFormErrors.requestNumber}</FormFeedback>
                </Col>

                <Col md={4}>
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

                <Col md={5}>
                  <Label className="form-label">
                    {t("Total Budget")} (S/.) <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={createFormValues.totalBudget}
                    onChange={(event) =>
                      setCreateFormValues((prev) => ({
                        ...prev,
                        totalBudget: event.target.value,
                      }))
                    }
                    invalid={Boolean(createFormErrors.totalBudget)}
                    placeholder="0.000"
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
                    rows={2}
                    value={createFormValues.reason}
                    onChange={(event) =>
                      setCreateFormValues((prev) => ({
                        ...prev,
                        reason: event.target.value,
                      }))
                    }
                    invalid={Boolean(createFormErrors.reason)}
                    placeholder={t("Enter trip expense reason...")}
                    disabled={creatingExpenseRequest}
                  />
                  <FormFeedback>{createFormErrors.reason}</FormFeedback>
                </Col>
              </Row>

              {/* Expense Details Section */}
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mt-4 mb-3">
                <div>
                  <h6 className="mb-0 fw-bold">{t("Expense Details")}</h6>
                  <small className="text-muted">
                    {t("Configure concepts and calculation rules (Fixed, Per axle, Per day, Per night, Manual).")}
                  </small>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    color="light"
                    type="button"
                    className="d-inline-flex align-items-center gap-1 border"
                    onClick={handleAddDetail}
                    disabled={creatingExpenseRequest}
                  >
                    <i className="ri-add-line text-primary" />
                    <span>{t("Add Detail")}</span>
                  </Button>
                </div>
              </div>

              {createDetailsError && (
                <div className="alert alert-danger py-2 mb-3">
                  {createDetailsError}
                </div>
              )}

              {/* Expense Details Table */}
              <div className="table-responsive border rounded-3 mb-3">
                <Table className="table align-middle mb-0" style={{ minWidth: "1160px" }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "40px" }} className="text-center">#</th>
                      <th style={{ width: "240px", minWidth: "240px" }}>
                        {t("Concept")} <span className="text-danger">*</span>
                      </th>
                      <th style={{ width: "180px", minWidth: "180px" }}>
                        {t("Cálculo de costo")}
                      </th>
                      <th style={{ width: "100px", minWidth: "100px" }}>
                        {t("Cantidad")}
                      </th>
                      <th style={{ width: "120px", minWidth: "120px" }}>
                        {t("Monto Unit.")}
                      </th>
                      <th style={{ width: "165px", minWidth: "165px" }}>
                        {t("Presupuesto")} (S/.) <span className="text-danger">*</span>
                      </th>
                      <th style={{ minWidth: "250px" }}>{t("Notas")}</th>
                      <th style={{ width: "60px" }} className="text-center">{t("Acción")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createFormValues.details.map((detail, detailIndex) => {
                      const detailError = createDetailErrors[detailIndex] || {};
                      const selectedConcept =
                        conceptOptions.find(
                          (option) => option.value === detail.conceptId
                        ) ?? null;

                      const matchingRule = expenseRules.find(
                        (r) => String(r.id_concept) === detail.conceptId && r.is_active
                      );

                      return (
                        <tr key={`expense-detail-${detailIndex}`}>
                          <td className="text-center fw-medium text-muted">
                            {detailIndex + 1}
                          </td>

                          {/* Concept Select */}
                          <td>
                            <Select
                              value={selectedConcept}
                              options={conceptOptions}
                              onChange={(selected: SelectOption | null) =>
                                handleConceptChange(
                                  detailIndex,
                                  selected?.value ?? ""
                                )
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
                              <div className="invalid-feedback d-block font-size-11">
                                {detailError.conceptId}
                              </div>
                            )}
                          </td>

                          {/* Cálculo de costo Select */}
                          <td>
                            <Input
                              type="select"
                              className="form-select"
                              style={{ height: "38px" }}
                              value={detail.calculationType || "MANUAL"}
                              onChange={(e) =>
                                handleCalculationTypeChange(
                                  detailIndex,
                                  e.target.value
                                )
                              }
                              disabled={creatingExpenseRequest}
                            >
                              {CALCULATION_TYPES.map((ct) => (
                                <option key={ct.value} value={ct.value}>
                                  {ct.label}
                                </option>
                              ))}
                            </Input>
                          </td>

                          {/* Cantidad */}
                          <td>
                            <Input
                              type="number"
                              step="any"
                              className="text-end"
                              style={{ height: "38px" }}
                              value={detail.quantity}
                              onChange={(e) =>
                                handleQuantityChange(detailIndex, e.target.value)
                              }
                              disabled={creatingExpenseRequest}
                              placeholder="1"
                            />
                          </td>

                          {/* Monto Unitario */}
                          <td>
                            <Input
                              type="number"
                              step="any"
                              className="text-end"
                              style={{ height: "38px" }}
                              value={detail.unitAmount}
                              onChange={(e) =>
                                handleUnitAmountChange(
                                  detailIndex,
                                  e.target.value
                                )
                              }
                              disabled={creatingExpenseRequest}
                              placeholder="0.000"
                            />
                          </td>

                          {/* Presupuesto */}
                          <td>
                            <Input
                              type="number"
                              step="any"
                              className={`text-end ${
                                detailError.budgetedAmount ? "is-invalid" : ""
                              }`}
                              style={{ height: "38px" }}
                              value={detail.budgetedAmount}
                              onChange={(e) =>
                                handleBudgetedAmountChange(
                                  detailIndex,
                                  e.target.value
                                )
                              }
                              disabled={creatingExpenseRequest}
                              placeholder="0.000"
                            />
                            {detailError.budgetedAmount && (
                              <div className="invalid-feedback d-block font-size-11">
                                {detailError.budgetedAmount}
                              </div>
                            )}
                          </td>

                          {/* Notas */}
                          <td>
                            <Input
                              type="text"
                              style={{ height: "38px" }}
                              value={detail.notes}
                              onChange={(e) =>
                                handleNotesChange(detailIndex, e.target.value)
                              }
                              placeholder={t("Notes or rule details...")}
                              disabled={creatingExpenseRequest}
                            />
                          </td>

                          {/* Acciones */}
                          <td className="text-center">
                            <Button
                              color="danger"
                              type="button"
                              outline
                              style={{ height: "38px", width: "38px" }}
                              className="d-inline-flex align-items-center justify-content-center p-0"
                              onClick={() => handleRemoveDetail(detailIndex)}
                              disabled={
                                creatingExpenseRequest ||
                                createFormValues.details.length === 1
                              }
                              title={t("Remove")}
                            >
                              <i className="ri-delete-bin-line fs-5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <td colSpan={5} className="text-end fw-bold">
                        {t("Total Calculado:")}
                      </td>
                      <td className="text-end fw-bold fs-6 text-primary">
                        S/. {formatBudgetAmount(
                          createFormValues.details.reduce(
                            (acc, d) => acc + parseAmount(d.budgetedAmount),
                            0
                          )
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Form Action Buttons */}
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
                    className="d-inline-flex align-items-center gap-1"
                  >
                    {creatingExpenseRequest && (
                      <Spinner size="sm" className="me-1 text-white" />
                    )}
                    <i className="ri-save-line align-bottom" />
                    <span>{t("Guardar solicitud / Ajustes")}</span>
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
