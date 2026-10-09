import {
  AlarmClockIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  FileUpIcon,
  ListTodoIcon,
  PlusIcon,
  SearchXIcon,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { createClient, getUser } from "@/lib/supabase/server";
import { getTaskSummary } from "@/lib/task-summary";
import {
  TASK_COLUMNS,
  escapeLikePattern,
  groupTasks,
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

  // RLS limits this to the signed-in user's rows; we only hide soft-deleted ones.
  let query = supabase.from("tasks").select(TASK_COLUMNS).is("deleted_at", null);

  if (filters.q) query = query.ilike("search_text", `%${escapeLikePattern(filters.q)}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.due === "overdue") query = query.lt("due_date", today).neq("status", "done");
  if (filters.due === "today") query = query.eq("due_date", today);
  if (filters.due === "week") query = query.gte("due_date", today).lte("due_date", isoDate(7));

  const [list, summary, user] = await Promise.all([
    query
      .order("due_date")
      .order("priority")
      .order("created_at")
      .limit(500)
      .overrideTypes<Task[], { merge: false }>(),
    getTaskSummary(), // shared with the layout via React cache()
    getUser(),
  ]);

  // Shown by error.tsx, which offers a retry.
  if (list.error) throw new Error("Could not load your tasks.");

  const tasks = list.data;
  const view = activeView(filters);
  const filtered = hasActiveFilters(filters);

  return (
    // On large screens the page fills the viewport and only the task table scrolls.
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <Greeting name={user?.email?.split("@")[0] ?? ""} open={summary.open} dueToday={summary.today} overdue={summary.overdue} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[40rem]">
          <StatCard href={viewHref("")} label="Open tasks" value={summary.open} icon={ListTodoIcon} tone="indigo" active={view?.id === "all"} />
          <StatCard href={viewHref("due=today")} label="Due today" value={summary.today} icon={CalendarCheckIcon} tone="amber" active={view?.id === "today"} />
          <StatCard href={viewHref("due=overdue")} label="Overdue" value={summary.overdue} icon={AlarmClockIcon} tone="red" active={view?.id === "overdue"} />
          <StatCard
            href={viewHref("status=done")}
            label="Completed"
            value={summary.done}
            icon={CircleCheckIcon}
            tone="emerald"
            active={view?.id === "done"}
            progress={summary.all ? summary.done / summary.all : 0}
          />
        </div>
      </header>

      <section
        aria-labelledby="task-list-heading"
        className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm lg:min-h-0 lg:flex-1"
      >
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
          <h2 id="task-list-heading" className="flex shrink-0 items-center gap-2 pl-1 font-semibold tracking-tight">
            {view?.label ?? "Filtered tasks"}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {tasks.length}
            </span>
          </h2>
          <TaskToolbar filters={filters} />
        </div>

        {tasks.length > 0 ? (
          <TaskTable groups={groupTasks(tasks, today)} today={today} />
        ) : filtered ? (
          <Empty className="flex-1 py-16">
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
          <Empty className="flex-1 py-16">
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

function Greeting({ name, open, dueToday, overdue }: { name: string; open: number; dueToday: number; overdue: number }) {
  const now = new Date();
  const hour = now.getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now);

  const parts = [`${open} open`];
  if (dueToday) parts.push(`${dueToday} due today`);
  if (overdue) parts.push(`${overdue} overdue`);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {salutation}
          {name && <span className="text-muted-foreground">, {name}</span>}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <span className="font-medium text-primary">{date}</span> · {parts.join(" · ")}
        </p>
      </div>
      <Button asChild className="shadow-md shadow-primary/25 lg:hidden">
        <Link href="/tasks/new">
          <PlusIcon /> New task
        </Link>
      </Button>
    </div>
  );
}
