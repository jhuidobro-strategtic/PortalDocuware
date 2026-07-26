import { buildApiUrl } from "../../../../../helpers/api-url";
import { getAuthHeaders, getCurrentSessionUser } from "../../../my-schedule/shared/session";

export interface ExpenseDetailItem {
  expense_detail_id: number;
  id_request: number;
  id_concept: number;
  concept?: {
    id_concept: number;
    nombre_concepto: string;
  };
  budgeted_amount: string;
  notes?: string;
}

export interface ExpenseRequestData {
  id_request: number;
  request_number: string;
  requester_name?: string | number;
  reason?: string;
  total_budget?: string;
  status?: number;
  status_data?: {
    id: number;
    tipo_catalogo?: string;
    codigo?: string;
    descripcion: string;
  };
  details?: ExpenseDetailItem[];
}

export interface ExpenseAdvanceItem {
  id?: number;
  expense_advance_id?: number;
  id_request: number;
  request_number: string;
  anticipo_number: string;
  requester_name: string;
  requester_dni: string;
  requester_email: string;
  cost_center: string | number | null;
  cost_center_data?: any;
  amount: string;
  currency: string;
  delivery_date: string;
  payment_method: string | number | null;
  payment_method_data?: {
    id?: number;
    descripcion?: string;
    codigo?: string;
  };
  bank: string | number | null;
  bank_data?: {
    id?: number;
    descripcion?: string;
    codigo?: string;
  };
  account_type: string | number | null;
  account_type_data?: {
    id?: number;
    descripcion?: string;
    codigo?: string;
  };
  account_number: string;
  cci: string;
  operation_number: string;
  approved_by: string;
  notes: string;
  status: number | string;
  status_data?: {
    id?: number;
    descripcion?: string;
    codigo?: string;
  };
  expense_request?: ExpenseRequestData;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateExpenseAdvancePayload {
  id?: number;
  expense_advance_id?: number;
  id_request: number;
  request_number: string;
  anticipo_number: string;
  requester_name: string;
  requester_dni: string;
  requester_email: string;
  cost_center?: string | number | null;
  amount: string;
  currency: string;
  delivery_date: string;
  payment_method?: string | number | null;
  bank?: string | number | null;
  account_type?: string | number | null;
  account_number: string;
  cci: string;
  operation_number: string;
  approved_by: string;
  notes: string;
  status: number;
  created_by?: number;
  updated_by?: number;
}

export interface ExpenseAdvanceResponse {
  success?: boolean;
  message?: string;
  data: ExpenseAdvanceItem[];
}

export const getExpenseAdvances = async (
  signal?: AbortSignal
): Promise<ExpenseAdvanceItem[]> => {
  const response = await fetch(buildApiUrl("expense-advances/"), {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error("Error fetching expense advances.");
  }

  const result: ExpenseAdvanceResponse | ExpenseAdvanceItem[] = await response.json();

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
};

export const getExpenseAdvanceById = async (
  id: number,
  signal?: AbortSignal
): Promise<ExpenseAdvanceItem | null> => {
  const response = await fetch(buildApiUrl(`expense-advances/${id}/`), {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error fetching expense advance #${id}.`);
  }

  const result = await response.json();
  return result?.data || result || null;
};

export const createExpenseAdvance = async (
  payload: CreateExpenseAdvancePayload,
  signal?: AbortSignal
): Promise<ExpenseAdvanceItem> => {
  const sessionUser = getCurrentSessionUser();
  const finalPayload = {
    ...payload,
    created_by: payload.created_by || sessionUser.id || 1,
  };

  const response = await fetch(buildApiUrl("expense-advances/"), {
    method: "POST",
    headers: getAuthHeaders(),
    signal,
    body: JSON.stringify(finalPayload),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok || responseData?.success === false) {
    const errorDetails = responseData?.data
      ? Object.entries(responseData.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ")
      : "";

    throw new Error(
      responseData?.message
        ? `${responseData.message}${errorDetails ? ` (${errorDetails})` : ""}`
        : "Error al registrar el anticipo."
    );
  }

  return responseData?.data || responseData;
};

export const updateExpenseAdvance = async (
  id: number,
  payload: CreateExpenseAdvancePayload,
  signal?: AbortSignal
): Promise<ExpenseAdvanceItem> => {
  const sessionUser = getCurrentSessionUser();
  const finalPayload = {
    ...payload,
    expense_advance_id: id,
    id: id,
    updated_by: sessionUser.id || 1,
  };

  const response = await fetch(buildApiUrl("expense-advances/"), {
    method: "POST",
    headers: getAuthHeaders(),
    signal,
    body: JSON.stringify(finalPayload),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok || responseData?.success === false) {
    const errorDetails = responseData?.data
      ? Object.entries(responseData.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ")
      : "";

    throw new Error(
      responseData?.message
        ? `${responseData.message}${errorDetails ? ` (${errorDetails})` : ""}`
        : `Error al actualizar el anticipo #${id}.`
    );
  }

  return responseData?.data || responseData;
};
