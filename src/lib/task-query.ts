import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { TASK_COLUMNS, escapeRegExp, isoDate, type TaskFilters } from "./tasks";

/**
 * The tasks query for a set of list filters. The task list, the sidebar
 * counts and the stat cards are all built here, so a view's count always
 * equals the rows it shows. RLS already limits every query to the signed-in
 * user's tasks; this hides soft-deleted ones and applies the filters.
 *
 * Every query asks for an exact count, so the list can say "500 of 4,014".
 * With `head: true` only the count comes back, no rows.
 */
export function queryTasks(
  supabase: SupabaseClient<Database>,
  filters: TaskFilters,
  { columns = TASK_COLUMNS, head = false, today = isoDate() } = {},
) {
  let query = supabase.from("tasks").select(columns, { count: "exact", head }).is("deleted_at", null);

  // A case-insensitive regex match rather than ILIKE: the Supabase API turns
  // * into a wildcard inside LIKE patterns and that can't be escaped. In a
  // regex, escaping makes every character the user typed literal.
  if (filters.q) query = query.filter("search_text", "imatch", escapeRegExp(filters.q));
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.due === "overdue") query = query.lt("due_date", today).neq("status", "done");
  if (filters.due === "today") query = query.eq("due_date", today);
  if (filters.due === "week") query = query.gte("due_date", today).lte("due_date", isoDate(7));

  return query;
}
