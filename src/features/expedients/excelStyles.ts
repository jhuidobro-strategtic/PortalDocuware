import type { Worksheet } from "exceljs";

/** Shared presentation for both sheets; values and number formats stay intact. */
export function styleExpedientWorksheet(sheet: Worksheet, widths: number[], statusColumn?: number) {
  sheet.properties.defaultRowHeight = 30;
  sheet.properties.tabColor = { argb: "FF405189" };
  sheet.views = [{ state: "frozen", ySplit: 1, xSplit: 2, showGridLines: false }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  sheet.columns.forEach((column, index) => { column.width = widths[index] || 24; });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.height = 58;
      row.eachCell(cell => {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF405189" } };
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
        cell.border = { bottom: { style: "medium", color: { argb: "FF0AB39C" } } };
      });
      return;
    }
    let lines = 1;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const numeric = typeof cell.value === "number" && cell.numFmt !== "@";
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF334155" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber % 2 === 0 ? "FFF2F5FA" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: numeric ? "right" : "left", wrapText: true, indent: 1 };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      if (typeof cell.value === "string") {
        const available = Math.max(8, (sheet.getColumn(columnNumber).width || 24) - 4);
        lines = Math.max(lines, ...cell.value.split("\n").map(line => Math.ceil(line.length / available)));
      }
    });
    row.height = Math.max(30, lines * 16 + 12);
    if (statusColumn) {
      const cell = row.getCell(statusColumn);
      const paid = String(cell.value || "").toUpperCase() === "PAGADO";
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: paid ? "FF047857" : "FF92400E" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: paid ? "FFD1FAE5" : "FFFEF3C7" } };
    }
  });
}
