import type { TaskFilters } from "./tasks";

/**
 * Saved views shown in the sidebar and as stat cards. Each one is just a set
 * of URL filters, so they work with the same server-side query as the toolbar.
 */
export const VIEWS = [
  { id: "all", label: "All tasks", query: "" },
  { id: "today", label: "Due today", query: "due=today" },
  { id: "week", label: "Next 7 days", query: "due=week" },
  { id: "overdue", label: "Overdue", query: "due=overdue" },
  { id: "in_progress", label: "In progress", query: "status=in_progress" },
  { id: "done", label: "Completed", query: "status=done" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export const viewHref = (query: string) => (query ? `/?${query}` : "/");

/** The view whose filters exactly match the current ones, if any. */
export function activeView(filters: TaskFilters): (typeof VIEWS)[number] | undefined {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", String(filters.priority));
  if (filters.due) params.set("due", filters.due);
  return VIEWS.find((view) => view.query === params.toString());
}
