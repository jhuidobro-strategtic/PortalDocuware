/** @jest-environment node */
import { matchesDateRange, matchesName } from "./document-list-filters";
test("date range includes both bounds and ignores timestamp time", () => {
  expect(matchesDateRange("2026-11-01", "2026-11-01", "2026-11-06")).toBe(true);
  expect(matchesDateRange("2026-11-06T23:59:00Z", "2026-11-01", "2026-11-06")).toBe(true);
  expect(matchesDateRange("2026-11-07", "2026-11-01", "2026-11-06")).toBe(false);
});
test("missing invoice is included only without an active date range", () => {
  expect(matchesDateRange(null, "", "")).toBe(true);
  expect(matchesDateRange(null, "2026-11-01", "")).toBe(false);
  expect(matchesDateRange("2026-11-01", "", "2026-11-02")).toBe(true);
  expect(matchesDateRange("2026-11-01", "2026-11-06", "2026-11-01")).toBe(false);
});
test("names match partial text regardless of accents and case", () => {
  expect(matchesName(["Transportes Pérez", null], "  PEREZ ")).toBe(true);
  expect(matchesName(["Transportes Pérez"], "otro")).toBe(false);
  expect(matchesName([], "")).toBe(true);
});
