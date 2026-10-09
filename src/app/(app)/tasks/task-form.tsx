"use client";

import { format, parseISO } from "date-fns";
import { AlertCircleIcon, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PriorityDot, PRIORITY_LABELS, STATUS_ICONS } from "@/components/task-badges";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, STATUS_LABELS, TITLE_MAX_LENGTH, isTaskStatus, type TaskStatus } from "@/lib/task-fields";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type { TaskFormState } from "./actions";

type Props = {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  task?: Task;
  submitLabel: string;
};

export function TaskForm({ action, task, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: null });
  const { errors } = state;

  // The date picker and selects are not native inputs, so their values live in
  // state and are submitted through hidden inputs below.
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [priority, setPriority] = useState(String(task?.priority ?? 3));
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // After a failed submit, the text fields show what the user typed.
  const title = state.values?.title ?? task?.title ?? "";
  const notes = state.values?.notes ?? task?.notes ?? "";

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="due_date" value={dueDate} />
      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="status" value={status} />

      <Card>
        <CardContent>
          <FieldGroup>
            {errors.form && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                name="title"
                defaultValue={title}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="What needs to be done?"
                aria-invalid={Boolean(errors.title)}
                autoFocus
              />
              {errors.title ? (
                <FieldError>{errors.title}</FieldError>
              ) : (
                <FieldDescription>Up to {TITLE_MAX_LENGTH} characters.</FieldDescription>
              )}
            </Field>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field data-invalid={Boolean(errors.due_date)}>
                <FieldLabel htmlFor="due-date">Due date</FieldLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="due-date"
                      variant="outline"
                      aria-invalid={Boolean(errors.due_date)}
                      className={cn("justify-start font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon />
                      {dueDate ? format(parseISO(dueDate), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ? parseISO(dueDate) : undefined}
                      defaultMonth={dueDate ? parseISO(dueDate) : undefined}
                      onSelect={(date) => {
                        setDueDate(date ? format(date, "yyyy-MM-dd") : "");
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {errors.due_date && <FieldError>{errors.due_date}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.priority)}>
                <FieldLabel htmlFor="priority">Priority</FieldLabel>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority" className="w-full" aria-invalid={Boolean(errors.priority)}>
                    {/* Explicit label so the trigger isn't blank before hydration. */}
                    <SelectValue>
                      <PriorityDot priority={Number(priority)} /> P{priority} · {PRIORITY_LABELS[Number(priority)]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        <PriorityDot priority={value} /> P{value} · {PRIORITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && <FieldError>{errors.priority}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.status)}>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select value={status} onValueChange={(value) => isTaskStatus(value) && setStatus(value)}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue>{STATUS_LABELS[status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((value) => {
                      const Icon = STATUS_ICONS[value];
                      return (
                        <SelectItem key={value} value={value}>
                          <Icon /> {STATUS_LABELS[value]}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.status && <FieldError>{errors.status}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={Boolean(errors.notes)}>
              <FieldLabel htmlFor="notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                rows={5}
                defaultValue={notes}
                placeholder="Add details, links or context…"
                aria-invalid={Boolean(errors.notes)}
              />
              {errors.notes && <FieldError>{errors.notes}</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2 border-t">
          <Button variant="outline" asChild>
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
