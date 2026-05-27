export interface TripReference {
  id: number;
  label: string;
}

export interface ScheduleExpenseRequestDetail {
  expenseDetailId: number;
  conceptLabel: string;
  budgetedAmount: string;
  notes: string;
}

export interface ScheduleExpenseRequest {
  idRequest: number;
  requestNumber: string;
  requesterId: number;
  reason: string;
  totalBudget: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  details: ScheduleExpenseRequestDetail[];
}

export interface ScheduleTrip {
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
  updatedAt: string;
  expenseRequests: ScheduleExpenseRequest[];
}

export interface UserApiItem {
  userID: number;
  userName?: string;
  fullName?: string;
}

export interface SessionUser {
  id: number | null;
  profileId: number | null;
}

export interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

export interface StatusMeta {
  label: string;
  className: string;
  icon: string;
  tone: "success" | "danger";
}

export interface ScheduleSummary {
  totalTrips: number;
  activeTrips: number;
  inactiveTrips: number;
  nextTrip: ScheduleTrip | null;
}

export interface CreateExpenseVoucherInput {
  idRequest: number;
  expenseDetailId: number;
  documentType: number;
  supplierRuc: string;
  seriesNumber: string;
  voucherNumber: string;
  amount: string;
  photoUrl: string;
  rejectionReason: string | null;
  status: number;
}

export interface CreateExpenseVoucherResult {
  id: number;
  responseData: any;
}

export interface ParsedExpenseVoucherQr {
  rawValue: string;
  supplierRuc: string;
  sunatDocumentType: string;
  seriesNumber: string;
  voucherNumber: string;
  igvAmount: string;
  amount: string;
}
