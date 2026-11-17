/** @jest-environment node */
import { Workbook } from "exceljs";
import type { DocumentDetailsRow } from "../../types/details.types";
import { buildDocumentDetailExportRows } from "./exportRows";

test("exporta cada línea con su IGV y registra el total del comprobante una sola vez", async () => {
  const document: DocumentDetailsRow = {
    source_document_id: 1, documenttype: "FACTURA", suppliernumber: "20123456789",
    suppliername: "Proveedor", documentserial: "F001", documentnumber: "00012",
    documentdate: "2026-11-17", currency: "PEN", description: "Peaje", driver: "Comprador",
    centercost: "", vehicle_nro: "", unit_measure_description: "SERVICIO",
    quantity: 0.125, unit_value: 320, total_value: 40,
    amount: 100, taxamount: 18, totalamount: 118, detail_id: 1, tax_value: 7.2,
    payment_condition: "Crédito", order_number: "OS-001", accounting_code: "6315093001",
    centro_costo_1: { centrocodigo: "0001" }, centro_costo_2: { centrocodigo: "0002" },
  };
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Detalles");
  sheet.addRows(buildDocumentDetailExportRows([
    document, { ...document, detail_id: 2, total_value: 60, tax_value: 10.8 },
    { ...document, source_document_id: 2, detail_id: null },
  ]));
  const reopened = new Workbook();
  await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  const exported = reopened.getWorksheet("Detalles")!;
  expect(["A1", "G1", "K1", "L1", "O1", "P1", "X1", "Y1", "Z1", "AB1", "AD1"].map(
    (cell) => exported.getCell(cell).value,
  )).toEqual(["OS-001", "00012", "Peaje", "SERVICIO", 7.2, 47.2, "Crédito", "0001", "0002", 0.125, "6315093001"]);
  expect(exported.getCell("P2").value).toBe(70.8);
  expect(exported.getCell("AJ1").value).toBe(118);
  expect(exported.getCell("AJ2").value).toBeNull();
  expect(exported.getCell("P3").value).toBe(118);
});
