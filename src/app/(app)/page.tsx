import { FileUpIcon, ListTodoIcon, PlusIcon, SearchXIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_COLUMNS,
  escapeLikePattern,
  hasActiveFilters,
  isoDate,
  parseFilters,
  type Task,
} from "@/lib/tasks";
import { TaskTable } from "./task-table";
import { TaskToolbar } from "./task-toolbar";

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
  const overdue = data.filter((task) => task.status !== "done" && task.due_date < today).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {data.length === 1 ? "1 task" : `${data.length} tasks`}
            {filtered && (data.length === 1 ? " matches your filters" : " match your filters")}
            {overdue > 0 && <span className="text-destructive"> · {overdue} overdue</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/import">
              <UploadIcon /> Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tasks/new">
              <PlusIcon /> New task
            </Link>
          </Button>
        </div>
      </div>

      <TaskToolbar filters={filters} />

      {data.length > 0 ? (
        <TaskTable tasks={data} today={today} />
      ) : filtered ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>No matching tasks</EmptyTitle>
            <EmptyDescription>Try a different search or clear the filters.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href="/">Clear filters</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodoIcon />
            </EmptyMedia>
            <EmptyTitle>No tasks yet</EmptyTitle>
            <EmptyDescription>Create your first task, or import a batch from a CSV file.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button asChild>
              <Link href="/tasks/new">
                <PlusIcon /> New task
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/import">
                <FileUpIcon /> Import CSV
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
