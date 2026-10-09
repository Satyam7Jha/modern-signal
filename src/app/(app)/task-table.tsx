import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Task } from "@/lib/tasks";
import { TaskRow } from "./task-row";

export function TaskTable({ tasks, today }: { tasks: Task[]; today: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
      <Table>
        <TableHeader className="bg-muted/50">
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
        <TableBody>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
