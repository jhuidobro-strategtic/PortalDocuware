import type { Worksheet } from "exceljs";

interface ExcelStyleOptions {
  headerRow?: number;
  widths?: number[];
  statusColumn?: number;
}

function statusColors(value: unknown) {
  const status = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/INACTIV|RECHAZ|ANUL|CANCEL/.test(status)) return ["FFB91C1C", "FFFEE2E2"];
  if (/PENDIENT|PENDING|PARCIAL/.test(status)) return ["FF92400E", "FFFEF3C7"];
  if (/PAGADO|APROBAD|FIRMAD|ACTIVO|CONVERTID/.test(status)) return ["FF047857", "FFD1FAE5"];
  return ["FF475569", "FFE2E8F0"];
}

/** Standard export presentation. Call after adding all rows and number formats. */
export function styleExcelWorksheet(sheet: Worksheet, { headerRow = 1, widths, statusColumn }: ExcelStyleOptions = {}) {
  sheet.properties.defaultRowHeight = 30;
  sheet.properties.tabColor = { argb: "FF405189" };
  const columnCount = sheet.getRow(headerRow).cellCount;
  sheet.views = [{ state: "frozen", ySplit: headerRow, xSplit: Math.min(2, Math.max(0, columnCount - 1)), showGridLines: false }];
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columnCount } };
  sheet.columns.forEach((column, index) => { column.width = widths?.[index] || column.width || 24; });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < headerRow) {
      row.height = 26;
      row.eachCell(cell => {
        cell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF405189" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F5FA" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      return;
    }
    if (rowNumber === headerRow) {
      let headerLines = 1;
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF405189" } };
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
        cell.border = { bottom: { style: "medium", color: { argb: "FF0AB39C" } } };
        headerLines = Math.max(headerLines, Math.ceil(String(cell.value || "").length / Math.max(8, (sheet.getColumn(columnNumber).width || 24) - 4)));
      });
      row.height = Math.max(58, headerLines * 16 + 12);
      return;
    }
    let lines = 1;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const numeric = typeof cell.value === "number" && cell.numFmt !== "@";
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF334155" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: (rowNumber - headerRow) % 2 === 1 ? "FFF2F5FA" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: numeric ? "right" : "left", wrapText: true, indent: 1 };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      if (typeof cell.value === "string") {
        const available = Math.max(8, (sheet.getColumn(columnNumber).width || 24) - 4);
        lines = Math.max(lines, ...cell.value.split("\n").map(line => Math.ceil(line.length / available)));
      }
    });
    row.height = Math.min(409, Math.max(30, lines * 16 + 12));
    if (statusColumn) {
      const cell = row.getCell(statusColumn);
      const [foreground, background] = statusColors(cell.value);
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: foreground } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: background } };
    }
  });
}
