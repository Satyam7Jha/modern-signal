import type { Database } from "./database.types";
import { STATUSES, type TaskStatus } from "./task-fields";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

// status is a text column with a CHECK constraint, so the generated type is
// plain string; narrow it to the union the UI works with.
export type Task = Pick<TaskRow, "id" | "title" | "notes" | "due_date" | "priority" | "created_at"> & {
  status: TaskStatus;
};

export const TASK_COLUMNS = "id, title, notes, due_date, priority, status, created_at";

export const DUE_FILTERS = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due in the next 7 days",
} as const;
type DueFilter = keyof typeof DUE_FILTERS;

/** The list filters, read from the URL so they survive reloads and can be shared. */
export type TaskFilters = {
  q: string;
  status: TaskStatus | "";
  priority: number | null;
  due: DueFilter | "";
};

export function parseFilters(params: Record<string, string | string[] | undefined>): TaskFilters {
  const read = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };

  const status = read("status");
  const priority = Number(read("priority"));
  const due = read("due");

  return {
    q: read("q").slice(0, 200),
    status: (STATUSES as readonly string[]).includes(status) ? (status as TaskStatus) : "",
    priority: Number.isInteger(priority) && priority >= 1 && priority <= 5 ? priority : null,
    due: due in DUE_FILTERS ? (due as DueFilter) : "",
  };
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Boolean(filters.q || filters.status || filters.priority || filters.due);
}

/**
 * Escapes the LIKE wildcards % and _ (and the escape character itself) so a
 * search for "50%" matches that text literally.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Today's date as YYYY-MM-DD, offset by a number of days. */
export function isoDate(offsetDays = 0, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
