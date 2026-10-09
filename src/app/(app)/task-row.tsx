"use client";

import { CalendarIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { formatDueDate, PriorityBadge, PriorityDot, STATUS_ICONS, StatusBadge } from "@/components/task-badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { isTaskStatus, STATUSES, STATUS_LABELS, type TaskStatus } from "@/lib/task-fields";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { deleteTask, restoreTask, setTaskStatus } from "./tasks/actions";

export function TaskRow({ task, today }: { task: Task; today: string }) {
  const [, startTransition] = useTransition();
  // Reflect a status change or delete instantly; it reverts if the server action fails.
  const [optimistic, setOptimistic] = useOptimistic({ status: task.status, deleted: false });

  if (optimistic.deleted) return null;

  const done = optimistic.status === "done";
  const overdue = !done && task.due_date < today;

  function changeStatus(status: TaskStatus) {
    startTransition(async () => {
      setOptimistic({ status, deleted: false });
      const result = await setTaskStatus(task.id, status);
      if (result.error) toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      setOptimistic({ status: optimistic.status, deleted: true });
      const result = await deleteTask(task.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Task deleted", {
        description: task.title,
        action: { label: "Undo", onClick: () => undoDelete(task.id) },
      });
    });
  }

  return (
    <TableRow className="group">
      <TableCell className="pl-4">
        <Checkbox
          checked={done}
          onCheckedChange={(checked) => changeStatus(checked ? "done" : "todo")}
          aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        />
      </TableCell>

      <TableCell className="max-w-0 whitespace-normal">
        <Link
          href={`/tasks/${task.id}/edit`}
          className={cn(
            "font-medium break-words underline-offset-4 hover:underline",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </Link>
        {task.notes && <p className="truncate text-sm text-muted-foreground">{task.notes}</p>}
        {/* On small screens the Due / Priority / Status columns are hidden, so show them here. */}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground md:hidden">
          <PriorityDot priority={task.priority} />
          <span className={cn("sm:hidden", overdue && "font-medium text-destructive")}>
            {formatDueDate(task.due_date)}
          </span>
          <span>{STATUS_LABELS[optimistic.status]}</span>
        </div>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <span className={cn("flex items-center gap-1.5 text-sm", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
          <CalendarIcon className="size-3.5" />
          {formatDueDate(task.due_date)}
        </span>
        {overdue && <span className="text-xs text-destructive">Overdue</span>}
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <PriorityBadge priority={task.priority} />
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <StatusBadge status={optimistic.status} />
      </TableCell>

      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for "${task.title}"`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/tasks/${task.id}/edit`}>
                <PencilIcon /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={optimistic.status}
              onValueChange={(value) => isTaskStatus(value) && changeStatus(value)}
            >
              {STATUSES.map((status) => {
                const Icon = STATUS_ICONS[status];
                return (
                  <DropdownMenuRadioItem key={status} value={status}>
                    <Icon /> {STATUS_LABELS[status]}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={remove}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

async function undoDelete(id: string) {
  const result = await restoreTask(id);
  if (result.error) toast.error(result.error);
  else toast.success("Task restored");
}
