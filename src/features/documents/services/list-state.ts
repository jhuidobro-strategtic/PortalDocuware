export interface DocumentListState {
  searchTerm: string;
  statusFilter: string;
  orderFilter: string;
  dateRange: Date[];
  currentPage: number;
}

export const restoreDocumentListState = (saved: unknown): DocumentListState => {
  const value = saved && typeof saved === "object" ? saved as Record<string, unknown> : {};
  return {
    searchTerm: typeof value.searchTerm === "string" ? value.searchTerm : "",
    statusFilter: ["all", "active", "pending"].includes(String(value.statusFilter)) ? String(value.statusFilter) : "all",
    orderFilter: ["all", "with", "without"].includes(String(value.orderFilter)) ? String(value.orderFilter) : "all",
    dateRange: Array.isArray(value.dateRange) ? value.dateRange.slice(0, 2)
      .filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}T/.test(date))
      .map((date) => new Date(date)).filter((date) => Number.isFinite(date.getTime())) : [],
    currentPage: typeof value.currentPage === "number" && Number.isSafeInteger(value.currentPage) && value.currentPage > 0 ? value.currentPage : 1,
  };
};
