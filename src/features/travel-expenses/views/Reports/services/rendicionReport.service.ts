import { buildApiUrl } from "../../../../../helpers/api-url";
import { getAuthHeaders } from "../../../my-schedule/shared/session";

export interface RendicionReportSummary {
  total_budget: string;
  total_advances: string;
  total_reported: string;
  advance_balance: string;
  budget_balance: string;
}

export interface RendicionReportVoucher {
  expense_voucher_id: number;
  id_request: number;
  expense_detail_id: number;
  document_type: number;
  document_type_data?: {
    tipoid?: number;
    tipo?: string;
  };
  supplier_ruc: string;
  series_number: string;
  voucher_number: string;
  amount: string;
  photo_url?: string;
  rejection_reason?: string | null;
  status?: number;
  status_data?: {
    id?: number;
    descripcion?: string;
  };
  created_at?: string;
}

export interface RendicionReportDetail {
  expense_detail_id: number;
  id_concept: number;
  concept?: {
    id_concept: number;
    nombre_concepto: string;
  };
  budgeted_amount: string;
  notes?: string;
  vouchers?: RendicionReportVoucher[];
}

export interface RendicionReportAdvance {
  expense_advance_id: number;
  id_request: number;
  anticipo_number: string;
  amount: string;
  currency: string;
  delivery_date: string;
  account_number?: string;
  account_type_data?: {
    id?: number;
    descripcion?: string;
  };
  cci?: string;
  operation_number?: string;
  approved_by?: string;
  requester_name?: string;
  requester_dni?: string;
  requester_email?: string;
  payment_method_data?: {
    id?: number;
    descripcion?: string;
  };
  bank_data?: {
    id?: number;
    descripcion?: string;
  };
  cost_center_data?: {
    id?: number;
    descripcion?: string;
  };
  status_data?: {
    id?: number;
    descripcion?: string;
  };
}

export interface RendicionReportRequest {
  id_request: number;
  request_number: string;
  requester_name?: string | number;
  reason?: string;
  total_budget: string;
  status?: number;
  status_data?: {
    id?: number;
    descripcion?: string;
  };
  created_at?: string;
}

export interface RendicionReportData {
  request: RendicionReportRequest;
  advances: RendicionReportAdvance[];
  details: RendicionReportDetail[];
  summary: RendicionReportSummary;
}

export interface ExpenseRequestListItem {
  id_request: number;
  request_number: string;
  requester_name?: string | number;
  reason?: string;
  total_budget?: string;
  status?: number;
  status_data?: {
    id?: number;
    descripcion?: string;
  };
  created_at?: string;
  trip?: {
    driver?: {
      fullName?: string;
    };
  };
}

export const getExpenseRequestsForReport = async (
  signal?: AbortSignal
): Promise<ExpenseRequestListItem[]> => {
  const response = await fetch(buildApiUrl("expense-requests/"), {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error("Error al obtener las solicitudes de gastos.");
  }

  const result = await response.json();

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
};

export const getRendicionReport = async (
  requestId: number,
  signal?: AbortSignal
): Promise<RendicionReportData | null> => {
  const response = await fetch(buildApiUrl(`expense-requests/${requestId}/rendicion-report/`), {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error al obtener el reporte de rendición para la solicitud #${requestId}.`);
  }

  const result = await response.json();
  return result?.data || result || null;
};

export const openRendicionReportPdf = async (requestId: number): Promise<void> => {
  const response = await fetch(buildApiUrl(`expense-requests/${requestId}/rendicion-report/pdf/`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Error al obtener el reporte PDF de la solicitud #${requestId}.`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
};
