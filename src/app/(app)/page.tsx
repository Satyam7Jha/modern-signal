import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_COLUMNS,
  escapeLikePattern,
  hasActiveFilters,
  isoDate,
  parseFilters,
  type Task,
} from "@/lib/tasks";
import { TaskFilters } from "./task-filters";
import { TaskList } from "./task-list";

export default async function TasksPage({ searchParams }: PageProps<"/">) {
  const filters = parseFilters(await searchParams);
  const supabase = await createClient();

  // RLS limits this to the signed-in user's rows; we only hide soft-deleted ones.
  let query = supabase.from("tasks").select(TASK_COLUMNS).is("deleted_at", null);

  if (filters.q) query = query.ilike("search_text", `%${escapeLikePattern(filters.q)}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);

  const today = isoDate();
  if (filters.due === "overdue") query = query.lt("due_date", today).neq("status", "done");
  if (filters.due === "today") query = query.eq("due_date", today);
  if (filters.due === "week") query = query.gte("due_date", today).lte("due_date", isoDate(7));

  const { data, error } = await query
    .order("due_date")
    .order("priority")
    .order("created_at")
    .limit(500)
    .overrideTypes<Task[], { merge: false }>();

  // Shown by error.tsx, which offers a retry.
  if (error) throw new Error("Could not load your tasks.");

  const filtered = hasActiveFilters(filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Tasks</h1>
        <Link href="/import" className="btn">
          Import CSV
        </Link>
        <Link href="/tasks/new" className="btn-primary">
          New task
        </Link>
      </div>

      <TaskFilters filters={filters} />

      {data.length === 0 ? (
        <EmptyState filtered={filtered} />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {data.length === 1 ? "1 task" : `${data.length} tasks`}
            {filtered && (data.length === 1 ? " matches these filters" : " match these filters")}
          </p>
          <TaskList tasks={data} today={today} />
        </>
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="card px-6 py-12 text-center">
      {filtered ? (
        <>
          <p className="font-medium">No tasks match these filters.</p>
          <Link href="/" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <p className="font-medium">No tasks yet.</p>
          <p className="mt-1 text-sm text-slate-500">Create your first task or import a CSV file.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/tasks/new" className="btn-primary">
              New task
            </Link>
            <Link href="/import" className="btn">
              Import CSV
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
