import { cache } from "react";
import { createClient } from "./supabase/server";
import { queryTasks } from "./task-query";
import { isoDate, parseFilters } from "./tasks";
import { VIEWS, type ViewId } from "./views";

export type TaskSummary = Record<ViewId, number> & { open: number };

/**
 * Task counts for the sidebar views and the stat cards. Each count is a
 * database count query built from the view's own URL filters, so a view's
 * badge equals its rows and no task rows are downloaded.
 * React's cache() lets the layout and the page share one set of queries per request.
 */
export const getTaskSummary = cache(async (): Promise<TaskSummary> => {
  const supabase = await createClient();
  const today = isoDate();

  const counts = await Promise.all(
    VIEWS.map(async (view) => {
      const filters = parseFilters(Object.fromEntries(new URLSearchParams(view.query)));
      const { count, error } = await queryTasks(supabase, filters, { columns: "id", head: true, today });
      if (error || count === null) throw new Error("Could not load your tasks.");
      return [view.id, count] as const;
    }),
  );

  const summary = Object.fromEntries(counts) as Record<ViewId, number>;
  return { ...summary, open: summary.all - summary.done };
});
