import { CircleCheckIcon, CircleDashedIcon, CircleIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type TaskStatus } from "@/lib/task-fields";
import { cn } from "@/lib/utils";

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-amber-400",
  4: "bg-sky-500",
  5: "bg-zinc-400",
};

export function PriorityDot({ priority }: { priority: number }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[priority])} />;
}

export function PriorityBadge({ priority }: { priority: number }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <PriorityDot priority={priority} />
      P{priority} · {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  todo: CircleIcon,
  in_progress: CircleDashedIcon,
  done: CircleCheckIcon,
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", STATUS_STYLES[status])}>
      <Icon />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// Due dates are calendar dates (no time), so format them in UTC to avoid
// shifting a day in time zones west of UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatDueDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}
