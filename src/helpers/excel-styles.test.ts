import { Workbook } from "exceljs";
import { styleExcelWorksheet } from "./excel-styles";

test.each([1, 3])("aplica el estándar con encabezado en fila %s sin alterar datos ni formatos", async headerRow => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Reporte");
  if (headerRow === 3) {
    sheet.mergeCells("B1:D2");
    sheet.getCell("B1").value = "REPORTE";
  }
  sheet.getRow(headerRow).values = ["Código", "Importe", "Estado", "Descripción"];
  sheet.addRow(["000012", 1234.5, "Pagado", "Texto extenso ".repeat(12)]);
  sheet.addRow(["000013", 0, "Pendiente de pago", "Otro texto"]);
  sheet.getColumn(1).numFmt = "@";
  sheet.getColumn(2).numFmt = "#,##0.00";
  sheet.getCell(headerRow, 2).note = "Importe del documento";
  styleExcelWorksheet(sheet, { headerRow, widths: [18, 22, 26, 45], statusColumn: 3 });
  const restored = new Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  const result = restored.getWorksheet("Reporte")!;
  expect(result.getRow(headerRow + 1).values).toEqual([undefined, "000012", 1234.5, "Pagado", "Texto extenso ".repeat(12)]);
  expect(result.getCell(headerRow + 1, 2).numFmt).toBe("#,##0.00");
  expect(result.getCell(headerRow + 1, 1).numFmt).toBe("@");
  expect(result.getCell(headerRow, 2).note).toBe("Importe del documento");
  expect(result.views[0]).toMatchObject({ ySplit: headerRow, xSplit: 2, showGridLines: false });
  expect(result.getRow(headerRow + 1).height).toBeGreaterThan(30);
  expect(result.getCell(headerRow, 1).fill).toMatchObject({ fgColor: { argb: "FF405189" } });
  expect(result.model.merges).toEqual(sheet.model.merges);
  expect(result.getCell("B1").value).toBe(sheet.getCell("B1").value);
});

test.each([
  ["Activo", "FFD1FAE5"], ["Inactivo", "FFFEE2E2"], ["Rechazado", "FFFEE2E2"],
  ["Firmada · pendiente de comprobante", "FFFEF3C7"], ["Aprobado", "FFD1FAE5"],
])("distingue el estado %s", (status, color) => {
  const sheet = new Workbook().addWorksheet("Estados");
  sheet.addRow(["Estado"]); sheet.addRow([status]);
  styleExcelWorksheet(sheet, { statusColumn: 1 });
  expect(sheet.getCell("A2").fill).toMatchObject({ fgColor: { argb: color } });
});
