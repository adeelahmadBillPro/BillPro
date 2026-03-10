import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: Record<string, any>[],
  columns: ExcelColumn[],
  fileName: string,
  sheetName: string = "Report"
) {
  // Build header row
  const headers = columns.map((c) => c.header);

  // Build data rows
  const rows = data.map((row) =>
    columns.map((col) => row[col.key] ?? "")
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 15 }));

  // Create workbook and save
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
