import { cache } from "react";
import { createClient } from "./supabase/server";
import { isoDate } from "./tasks";
import type { ViewId } from "./views";

export type TaskSummary = Record<ViewId, number> & { open: number };

/**
 * Task counts for the sidebar views and the stat cards. Each count uses the
 * same rule as the matching list filter, so a view's badge equals its rows.
 * React's cache() lets the layout and the page share one query per request.
 */
export const getTaskSummary = cache(async (): Promise<TaskSummary> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("status, due_date").is("deleted_at", null);
  if (error) throw new Error("Could not load your tasks.");

  const today = isoDate();
  const weekEnd = isoDate(7);
  const done = data.filter((task) => task.status === "done").length;

  return {
    all: data.length,
    open: data.length - done,
    today: data.filter((task) => task.due_date === today).length,
    week: data.filter((task) => task.due_date >= today && task.due_date <= weekEnd).length,
    overdue: data.filter((task) => task.status !== "done" && task.due_date < today).length,
    in_progress: data.filter((task) => task.status === "in_progress").length,
    done,
  };
});
