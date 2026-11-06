/** @jest-environment node */
import { fetchExpedientInvoiceDetails } from "./invoiceDetailsExport";
import { fetchPurchaseOrderInvoiceDetails } from "../purchase-orders/services/purchaseOrderInvoiceDetails";
jest.mock("../purchase-orders/services/purchaseOrderInvoiceDetails", () => ({ fetchPurchaseOrderInvoiceDetails: jest.fn() }));
const fetchDetails = fetchPurchaseOrderInvoiceDetails as jest.Mock;
const invoice = { documentid: 1, suppliernumber: "20123456789", documentserial: "F001", documentnumber: "12" };
beforeEach(() => fetchDetails.mockReset());
test("fetches invoice codes once even when multiple expedients reference the same invoice", async () => {
  fetchDetails.mockResolvedValue([{ document: 1, item_code: "00015-AB" }, { document: 2, item_code: "OTRA" }, { document: null, item_code: "" }]);
  const result = await fetchExpedientInvoiceDetails([invoice, invoice]);
  expect(fetchDetails).toHaveBeenCalledTimes(1);
  expect(result.get(1)?.map((line) => line.item_code)).toEqual(["00015-AB", ""]);
});
test("reports which invoice failed rather than returning an incomplete export", async () => {
  fetchDetails.mockRejectedValue(new Error("API error"));
  await expect(fetchExpedientInvoiceDetails([invoice])).rejects.toThrow("F001-12");
});
