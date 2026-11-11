import { accountingExportHeaders, accountingExportValues, documentExportCode } from "./accountingExport";

test.each([
  ["Factura electrónica", "01"], ["Recibo por honorarios", "02"], ["Boleta electrónica", "03"],
  ["Nota de crédito", "07"], ["Nota de débito", "08"], ["Guía", "00"],
])("exporta %s con el código %s, sin depender del ID interno", (tipo, code) => {
  expect(documentExportCode({ documenttype: { tipoid: 99, tipo } })).toBe(code);
});

test("el RH tiene código de exportación 02 aunque el ID interno sea 2 o 14", () => {
  expect(documentExportCode({ documenttype: 14, sourceKind: "RH" })).toBe("02");
  expect(documentExportCode(null, "CREDIT")).toBe("07");
  expect(documentExportCode(null, "NC")).toBe("07");
  expect(documentExportCode(null, "ND")).toBe("08");
});

test("exporta tasas numéricas y neto sin duplicar descuentos", () => {
  const values = accountingExportValues({ documenttype: null, totalamount: "1180", accounting_adjustment: {
    option_id: "freight", kind: "detraction", rate: "4", amount: "47.20", base: "1180", concept: "Transporte de Carga" } });
  expect(values).toHaveLength(accountingExportHeaders.length);
  expect(values[1]).toBe(0.04);
  expect(values[5]).toBe(47.2);
  expect(values[7]).toBe(1132.8);
  const rh = accountingExportValues({ documenttype: null, totalamount: "1000", withholdingamount: "80" });
  expect(rh[6]).toBe(80);
  expect(rh[7]).toBe(920);
});
