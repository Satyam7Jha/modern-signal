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
 * Escapes every regex special character so a search for "b*k" or "(draft)"
 * matches that text literally.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Today's date as YYYY-MM-DD, offset by a number of days. */
export function isoDate(offsetDays = 0, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `today` to `isoDay` (both YYYY-MM-DD); negative means in the past. */
export function daysBetween(today: string, isoDay: string): number {
  return Math.round((Date.parse(`${isoDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** A human due label: "Today", "Tomorrow", "In 3 days", "2 days ago", or a date further out. */
export function relativeDue(dueDate: string, today: string): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < -1 && days > -7) return `${-days} days ago`;
  const date = new Date(`${dueDate}T00:00:00Z`);
  return dueDate.slice(0, 4) === today.slice(0, 4) ? shortDate.format(date) : longDate.format(date);
}

export const TASK_GROUPS = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "Next 7 days",
  later: "Later",
  done: "Completed",
} as const;
export type TaskGroupId = keyof typeof TASK_GROUPS;
export type TaskGroup = { id: TaskGroupId; label: string; tasks: Task[] };

/**
 * Splits tasks (already sorted by due date, then priority) into sections.
 * Open tasks go by due date; completed tasks are collected at the end.
 */
export function groupTasks(tasks: Task[], today: string): TaskGroup[] {
  const buckets: Record<TaskGroupId, Task[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], done: [] };

  for (const task of tasks) {
    const days = daysBetween(today, task.due_date);
    const id: TaskGroupId =
      task.status === "done" ? "done"
      : days < 0 ? "overdue"
      : days === 0 ? "today"
      : days === 1 ? "tomorrow"
      : days <= 7 ? "week"
      : "later";
    buckets[id].push(task);
  }

  return (Object.keys(TASK_GROUPS) as TaskGroupId[])
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, label: TASK_GROUPS[id], tasks: buckets[id] }));
}
