import Link from "next/link";
import { STATUS_LABELS } from "@/lib/task-fields";
import type { Task } from "@/lib/tasks";
import { TaskRowActions } from "./task-row-actions";

const PRIORITY_STYLES: Record<number, string> = {
  1: "bg-red-100 text-red-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-amber-100 text-amber-800",
  4: "bg-sky-100 text-sky-800",
  5: "bg-slate-100 text-slate-700",
};

const STATUS_STYLES = {
  todo: "text-slate-600",
  in_progress: "text-indigo-700",
  done: "text-emerald-700",
};

// Due dates are calendar dates, so format them in UTC to avoid shifting a day.
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const formatDate = (isoDate: string) => dateFormat.format(new Date(`${isoDate}T00:00:00Z`));

export function TaskList({ tasks, today }: { tasks: Task[]; today: string }) {
  return (
    <ul className="card divide-y divide-slate-200">
      {tasks.map((task) => {
        const done = task.status === "done";
        const overdue = !done && task.due_date < today;

        return (
          <li key={task.id} className="flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap">
            <span
              title={`Priority ${task.priority}`}
              className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[task.priority]}`}
            >
              P{task.priority}
            </span>

            <div className="min-w-0 flex-1">
              <Link
                href={`/tasks/${task.id}/edit`}
                className={`font-medium break-words hover:underline ${done ? "text-slate-400 line-through" : ""}`}
              >
                {task.title}
              </Link>
              {task.notes && (
                <p className="mt-0.5 line-clamp-2 text-sm break-words whitespace-pre-line text-slate-500">
                  {task.notes}
                </p>
              )}
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                <span className={overdue ? "font-semibold text-red-600" : "text-slate-500"}>
                  {overdue ? "Overdue · " : "Due "}
                  {formatDate(task.due_date)}
                </span>
                <span className={STATUS_STYLES[task.status]}>{STATUS_LABELS[task.status]}</span>
              </p>
            </div>

            <TaskRowActions taskId={task.id} done={done} />
          </li>
        );
      })}
    </ul>
  );
}
