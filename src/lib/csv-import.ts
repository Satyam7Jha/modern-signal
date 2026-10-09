import Papa from "papaparse";
import { isValidIsoDate, parsePriority, titleError } from "./task-fields";

// Pure CSV import logic: no database or framework code, so every rule here
// is covered by unit tests. The route handler in app/api/import wires it to
// Supabase.

export const MAX_FILE_BYTES = 1024 * 1024; // 1 MB
export const MAX_DATA_ROWS = 5000;

export const CSV_COLUMNS = ["title", "due_date", "priority", "notes"] as const;
const REQUIRED_COLUMNS = ["title", "due_date", "priority"] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];
export type RawValues = Record<CsvColumn, string>;

/** A row that passed validation and is ready to insert. */
export type ImportRow = {
  rowNumber: number;
  title: string;
  due_date: string;
  priority: number;
  notes: string | null;
};

/** A row that will not be imported, with the reason shown to the user. */
export type RejectedRow = {
  rowNumber: number;
  reason: string;
  values: RawValues;
};

export type PreparedImport =
  | { ok: true; valid: ImportRow[]; rejected: RejectedRow[] }
  | { ok: false; error: string };

export const DUPLICATE_IN_ACCOUNT_REASON =
  "Duplicate: a task with this title and due date already exists in your account";

/**
 * Parses and validates a CSV file and removes duplicates within the file.
 *
 * Row numbers match what a spreadsheet shows: the header is row 1, so the
 * first data row is row 2. A quoted value that spans several lines still
 * counts as one row.
 */
export function prepareImport(text: string): PreparedImport {
  // Treat Windows (\r\n) and old Mac (\r) line endings as \n, including inside
  // quoted values, so notes never end up with stray \r characters.
  const normalized = text.replace(/\r\n?/g, "\n");

  // papaparse handles quoted commas, escaped quotes ("") and strips a UTF-8 BOM.
  const parsed = Papa.parse<string[]>(normalized, {
    delimiter: ",",
    newline: "\n",
    skipEmptyLines: false,
  });
  const records = parsed.data;

  // A file ending in a newline yields a trailing empty record; trailing blank
  // lines are not rows anyone meant to import.
  while (records.length > 0 && isBlank(records[records.length - 1])) {
    records.pop();
  }

  if (records.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  const header = records[0].map((name) => name.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required column(s): ${missing.join(", ")}. Expected a header row with: ${CSV_COLUMNS.join(", ")}.`,
    };
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length === 0) {
    return { ok: false, error: "The file has a header row but no data rows." };
  }
  if (dataRecords.length > MAX_DATA_ROWS) {
    return {
      ok: false,
      error: `The file has ${dataRecords.length} rows; the limit is ${MAX_DATA_ROWS} per import.`,
    };
  }

  // papaparse reports an unclosed quote against the record where it started.
  const unclosedQuoteRecords = new Set(
    parsed.errors.filter((e) => e.code === "MissingQuotes").map((e) => e.row),
  );

  const columnIndex = Object.fromEntries(
    CSV_COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<CsvColumn, number>;

  const valid: ImportRow[] = [];
  const rejected: RejectedRow[] = [];
  const firstRowByKey = new Map<string, number>();

  dataRecords.forEach((record, index) => {
    const rowNumber = index + 2; // +1 for the header, +1 because rows count from 1
    const values = readValues(record, columnIndex);

    if (unclosedQuoteRecords.has(index + 1)) {
      rejected.push({
        rowNumber,
        values,
        reason: "Unclosed quote: this row and everything after it could not be read",
      });
      return;
    }

    if (isBlank(record)) {
      rejected.push({ rowNumber, values, reason: "Row is empty" });
      return;
    }

    if (hasExtraValues(record, header.length)) {
      rejected.push({
        rowNumber,
        values,
        reason: `Row has more values than the header has columns. Wrap values that contain commas in double quotes.`,
      });
      return;
    }

    const result = validateValues(values);
    if (!result.ok) {
      rejected.push({ rowNumber, values, reason: result.errors.join("; ") });
      return;
    }

    const key = duplicateKey(result.row.title, result.row.due_date);
    const firstRow = firstRowByKey.get(key);
    if (firstRow !== undefined) {
      rejected.push({
        rowNumber,
        values,
        reason: `Duplicate: same title and due date as row ${firstRow} in this file`,
      });
      return;
    }

    firstRowByKey.set(key, rowNumber);
    valid.push({ rowNumber, ...result.row });
  });

  return { ok: true, valid, rejected };
}

/** Checks one row's values against the task rules. All problems are reported, not just the first. */
export function validateValues(
  values: RawValues,
): { ok: true; row: Omit<ImportRow, "rowNumber"> } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const title = values.title;
  const titleProblem = titleError(title);
  if (titleProblem) errors.push(titleProblem);

  if (values.due_date === "") {
    errors.push("Due date is required (YYYY-MM-DD)");
  } else if (!isValidIsoDate(values.due_date)) {
    errors.push(`Due date "${values.due_date}" is not a valid YYYY-MM-DD date`);
  }

  const priority = parsePriority(values.priority);
  if (values.priority === "") {
    errors.push("Priority is required (a whole number from 1 to 5)");
  } else if (priority === null) {
    errors.push(`Priority "${values.priority}" is not a whole number from 1 to 5`);
  }

  if (errors.length > 0 || priority === null) return { ok: false, errors };

  return {
    ok: true,
    row: { title, due_date: values.due_date, priority, notes: values.notes || null },
  };
}

/**
 * Two tasks are duplicates when their titles match ignoring case and
 * surrounding spaces, and their due dates are equal. The import_tasks SQL
 * function applies the same rule against tasks already in the account.
 */
export function duplicateKey(title: string, dueDate: string): string {
  return `${title.trim().toLowerCase()}|${dueDate}`;
}

/**
 * Combines the prepared rows with the database result. Rows that were sent
 * for import but not inserted already existed in the account.
 */
export function finishImport(
  valid: ImportRow[],
  rejected: RejectedRow[],
  importedRowNumbers: number[],
): { importedCount: number; rejected: RejectedRow[] } {
  const imported = new Set(importedRowNumbers);
  const accountDuplicates: RejectedRow[] = valid
    .filter((row) => !imported.has(row.rowNumber))
    .map((row) => ({
      rowNumber: row.rowNumber,
      reason: DUPLICATE_IN_ACCOUNT_REASON,
      values: {
        title: row.title,
        due_date: row.due_date,
        priority: String(row.priority),
        notes: row.notes ?? "",
      },
    }));

  return {
    importedCount: imported.size,
    rejected: [...rejected, ...accountDuplicates].sort((a, b) => a.rowNumber - b.rowNumber),
  };
}

/**
 * Builds the downloadable CSV of rejected rows. Values that a spreadsheet
 * would run as a formula (starting with = + - @ or a tab) are prefixed with
 * an apostrophe so opening the file in Excel is safe.
 */
export function rejectedRowsToCsv(rows: RejectedRow[]): string {
  return Papa.unparse({
    fields: ["row_number", "reason", ...CSV_COLUMNS],
    data: rows.map((row) => [
      String(row.rowNumber),
      row.reason,
      ...CSV_COLUMNS.map((column) => escapeFormula(row.values[column])),
    ]),
  });
}

function escapeFormula(value: string): string {
  return /^[=+\-@\t]/.test(value) ? `'${value}` : value;
}

function readValues(record: string[], columnIndex: Record<CsvColumn, number>): RawValues {
  const read = (column: CsvColumn) => {
    const index = columnIndex[column];
    return index === -1 ? "" : (record[index] ?? "").trim();
  };
  return {
    title: read("title"),
    due_date: read("due_date"),
    priority: read("priority"),
    notes: read("notes"),
  };
}

function isBlank(record: string[]): boolean {
  return record.every((value) => value.trim() === "");
}

function hasExtraValues(record: string[], headerLength: number): boolean {
  return record.slice(headerLength).some((value) => value.trim() !== "");
}
