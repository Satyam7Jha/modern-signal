import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaskGroup, TaskGroupId } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { TaskRow } from "./task-row";

const GROUP_DOT: Record<TaskGroupId, string> = {
  overdue: "bg-red-500",
  today: "bg-amber-500",
  tomorrow: "bg-indigo-500",
  week: "bg-sky-500",
  later: "bg-zinc-400",
  done: "bg-emerald-500",
};

export function TaskTable({ groups, today }: { groups: TaskGroup[]; today: string }) {
  return (
    // The table's own container is the scroll area, so the header can stick.
    <Table containerClassName="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <TableHeader className="sticky top-0 z-10 bg-background/95 shadow-[0_1px_0_var(--border)] backdrop-blur">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pl-4">
            <span className="sr-only">Done</span>
          </TableHead>
          <TableHead>Task</TableHead>
          <TableHead className="hidden w-36 sm:table-cell">Due</TableHead>
          <TableHead className="hidden w-36 md:table-cell">Priority</TableHead>
          <TableHead className="hidden w-32 md:table-cell">Status</TableHead>
          <TableHead className="w-12 pr-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      {groups.map((group) => (
        <TableBody key={group.id} className="border-t first:border-t-0">
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={6} className="py-2 pl-4">
              <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <span className={cn("size-1.5 rounded-full", GROUP_DOT[group.id])} />
                {group.label}
                <span className="font-normal tabular-nums">{group.tasks.length}</span>
              </span>
            </TableCell>
          </TableRow>
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} />
          ))}
        </TableBody>
      ))}
    </Table>
  );
}
