import { CalendarIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// A static, glassy preview of the task list for the sign-in showcase.

const SAMPLE_TASKS = [
  { title: "Ship the Q4 roadmap", due: "Today", priority: "bg-red-500", done: true },
  { title: "Review CSV import from finance", due: "Tomorrow", priority: "bg-orange-500", done: false },
  { title: "Plan team offsite", due: "Nov 15", priority: "bg-sky-500", done: false },
];

export function TaskPreviewCard() {
  return (
    <div className="motion-safe:animate-float [transform:perspective(1400px)_rotateX(10deg)_rotateY(-14deg)]">
      <div className="w-[22rem] rounded-2xl bg-white/[0.06] p-4 shadow-2xl shadow-indigo-950/50 ring-1 ring-white/15 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-100">Today</p>
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-200 ring-1 ring-indigo-400/30">
            1 of 3 done
          </span>
        </div>
        <ul className="space-y-1.5">
          {SAMPLE_TASKS.map((task) => (
            <li key={task.title} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-[5px] ring-1",
                  task.done ? "bg-indigo-500 ring-indigo-400" : "ring-white/30",
                )}
              >
                {task.done && <CheckIcon className="size-3 text-white" strokeWidth={3} />}
              </span>
              <span className={cn("flex-1 truncate text-sm", task.done ? "text-zinc-500 line-through" : "text-zinc-100")}>
                {task.title}
              </span>
              <span className={cn("size-1.5 rounded-full", task.priority)} />
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <CalendarIcon className="size-3" />
                {task.due}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 rounded-full bg-linear-to-r from-indigo-500 to-violet-500" />
        </div>
      </div>
    </div>
  );
}
