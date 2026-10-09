import {
  AlarmClockIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  FileUpIcon,
  ListTodoIcon,
  PlusIcon,
  SearchXIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
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
import { activeView, viewHref } from "@/lib/views";
import { TaskTable } from "./task-table";
import { TaskToolbar } from "./task-toolbar";

export default async function TasksPage({ searchParams }: PageProps<"/">) {
  const filters = parseFilters(await searchParams);
  const supabase = await createClient();
  const today = isoDate();

  // RLS limits both queries to the signed-in user's rows; we only hide soft-deleted ones.
  let query = supabase.from("tasks").select(TASK_COLUMNS).is("deleted_at", null);

  if (filters.q) query = query.ilike("search_text", `%${escapeLikePattern(filters.q)}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.due === "overdue") query = query.lt("due_date", today).neq("status", "done");
  if (filters.due === "today") query = query.eq("due_date", today);
  if (filters.due === "week") query = query.gte("due_date", today).lte("due_date", isoDate(7));

  const [list, summary] = await Promise.all([
    query
      .order("due_date")
      .order("priority")
      .order("created_at")
      .limit(500)
      .overrideTypes<Task[], { merge: false }>(),
    // Only two small columns, for the stat cards (independent of the filters).
    supabase.from("tasks").select("status, due_date").is("deleted_at", null),
  ]);

  // Shown by error.tsx, which offers a retry.
  if (list.error || summary.error) throw new Error("Could not load your tasks.");

  const tasks = list.data;
  const all = summary.data;
  const open = all.filter((task) => task.status !== "done");
  const stats = {
    open: open.length,
    today: open.filter((task) => task.due_date === today).length,
    overdue: open.filter((task) => task.due_date < today).length,
    done: all.length - open.length,
  };

  const view = activeView(filters);
  const filtered = hasActiveFilters(filters);
  const todayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{todayLabel}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{view?.label ?? "Filtered tasks"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/import">
              <UploadIcon /> Import CSV
            </Link>
          </Button>
          <Button asChild className="lg:hidden">
            <Link href="/tasks/new">
              <PlusIcon /> New task
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard href={viewHref("")} label="Open" value={stats.open} icon={ListTodoIcon} tone="indigo" active={view?.id === "all"} hint="Not done yet" />
        <StatCard href={viewHref("due=today")} label="Due today" value={stats.today} icon={CalendarCheckIcon} tone="amber" active={view?.id === "today"} hint="Open tasks due today" />
        <StatCard href={viewHref("due=overdue")} label="Overdue" value={stats.overdue} icon={AlarmClockIcon} tone="red" active={view?.id === "overdue"} hint={stats.overdue ? "Past their due date" : "Nothing overdue"} />
        <StatCard
          href={viewHref("status=done")}
          label="Completed"
          value={stats.done}
          icon={CircleCheckIcon}
          tone="emerald"
          active={view?.id === "done"}
          progress={all.length ? stats.done / all.length : 0}
        />
      </div>

      <section className="space-y-3">
        <TaskToolbar filters={filters} />

        {tasks.length > 0 ? (
          <>
            <TaskTable tasks={tasks} today={today} />
            <p className="px-1 text-xs text-muted-foreground">
              {tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}
              {filtered && " match these filters"} · sorted by due date, then priority
            </p>
          </>
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
          <Empty className="border bg-background py-16">
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
      </section>
    </div>
  );
}
