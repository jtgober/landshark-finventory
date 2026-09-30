export type CsvCell = string | number | boolean | Date | null | undefined;

/**
 * Spreadsheets treat a cell starting with = + - @ (or a tab/CR) as a formula, so
 * user-controlled text such as an activity name like `=HYPERLINK(...)` could run
 * when an admin opens the export. Prefixing a single quote makes it plain text.
 * Numbers are real numbers and are never prefixed.
 */
export function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === "number") text = Number.isFinite(value) ? String(value) : "";
  else if (typeof value === "boolean") text = value ? "true" : "false";
  else text = neutralizeFormula(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  // BOM so Excel opens UTF-8 names with accents correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
