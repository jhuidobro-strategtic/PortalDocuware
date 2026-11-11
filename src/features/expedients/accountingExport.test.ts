import { documentExportCode } from "./accountingExport";

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
