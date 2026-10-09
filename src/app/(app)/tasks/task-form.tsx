"use client";

import { addDays, format, parseISO } from "date-fns";
import { AlertCircleIcon, CalendarIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PriorityBadge, PriorityDot, PRIORITY_LABELS, STATUS_ICONS, StatusBadge } from "@/components/task-badges";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  NOTES_MAX_LENGTH,
  STATUSES,
  STATUS_LABELS,
  TITLE_MAX_LENGTH,
  characterLength,
  isTaskStatus,
  type TaskStatus,
} from "@/lib/task-fields";
import { isoDate, relativeDue, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type { TaskFormState } from "./actions";

type Props = {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  task?: Task;
  submitLabel: string;
};

const QUICK_DATES = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "Next week", days: 7 },
];

const segmentClass =
  "flex-1 gap-1.5 data-[state=on]:bg-primary/10 data-[state=on]:font-medium data-[state=on]:text-primary";

export function TaskForm({ action, task, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: null });
  const { errors } = state;

  // The date picker and segmented controls are not native inputs, so their
  // values live in state and are submitted through hidden inputs below.
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [priority, setPriority] = useState(String(task?.priority ?? 3));
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Text fields stay uncontrolled (after a failed submit they show what was
  // typed); the title is also tracked for the live preview.
  const initialTitle = state.values?.title ?? task?.title ?? "";
  const notes = state.values?.notes ?? task?.notes ?? "";
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const titleLength = characterLength(titleDraft.trim());

  const today = isoDate();

  return (
    <form action={formAction} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_18rem]">
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
                defaultValue={initialTitle}
                onChange={(event) => setTitleDraft(event.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="What needs to be done?"
                aria-invalid={Boolean(errors.title)}
                className="h-10 text-base"
                autoFocus
              />
              {errors.title ? (
                <FieldError>{errors.title}</FieldError>
              ) : (
                <FieldDescription className="flex justify-between">
                  <span>Keep it short and actionable.</span>
                  <span className="tabular-nums">
                    {titleLength}/{TITLE_MAX_LENGTH}
                  </span>
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.due_date)}>
              <FieldLabel htmlFor="due-date">Due date</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="due-date"
                      type="button"
                      variant="outline"
                      aria-invalid={Boolean(errors.due_date)}
                      className={cn("min-w-48 justify-start font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon />
                      {dueDate ? format(parseISO(dueDate), "EEE, MMM d, yyyy") : "Pick a date"}
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
                {QUICK_DATES.map(({ label, days }) => {
                  const value = format(addDays(new Date(), days), "yyyy-MM-dd");
                  return (
                    <Button
                      key={label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDueDate(value)}
                      className={cn("h-8 text-muted-foreground", dueDate === value && "bg-primary/10 text-primary")}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              {errors.due_date && <FieldError>{errors.due_date}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.priority)}>
              <FieldLabel>Priority</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={priority}
                // Radix sends "" when the selected item is clicked again; keep a value.
                onValueChange={(value) => value && setPriority(value)}
                aria-label="Priority"
                className="w-full"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <ToggleGroupItem key={value} value={String(value)} className={segmentClass}>
                    <PriorityDot priority={value} />
                    <span className="hidden sm:inline">{PRIORITY_LABELS[value]}</span>
                    <span className="sm:hidden">P{value}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {errors.priority && <FieldError>{errors.priority}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.status)}>
              <FieldLabel>Status</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={status}
                onValueChange={(value) => isTaskStatus(value) && setStatus(value)}
                aria-label="Status"
                className="w-full"
              >
                {STATUSES.map((value) => {
                  const Icon = STATUS_ICONS[value];
                  return (
                    <ToggleGroupItem key={value} value={value} className={segmentClass}>
                      <Icon /> {STATUS_LABELS[value]}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
              {errors.status && <FieldError>{errors.status}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.notes)}>
              <FieldLabel htmlFor="notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={notes}
                maxLength={NOTES_MAX_LENGTH}
                placeholder="Add details, links or context…"
                aria-invalid={Boolean(errors.notes)}
              />
              {errors.notes && <FieldError>{errors.notes}</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2 border-t">
          <Button variant="ghost" asChild>
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending} className="shadow-md shadow-primary/25">
            {pending && <Spinner />}
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>

      {/* Live preview of how the task will look in the list */}
      <Card className="lg:sticky lg:top-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <EyeIcon className="size-4 text-muted-foreground" /> Preview
          </CardTitle>
          <CardDescription>How it will appear in your list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p
              className={cn(
                "font-medium wrap-break-word",
                !titleDraft.trim() && "text-muted-foreground italic",
                status === "done" && "text-muted-foreground line-through",
              )}
            >
              {titleDraft.trim() || "Untitled task"}
            </p>
            <p className={cn("mt-1 flex items-center gap-1.5 text-xs", dueDate && dueDate < today && status !== "done" ? "text-destructive" : "text-muted-foreground")}>
              <CalendarIcon className="size-3.5" />
              {dueDate ? relativeDue(dueDate, today) : "No due date yet"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <PriorityBadge priority={Number(priority)} />
              <StatusBadge status={status} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: press <kbd className="rounded border bg-muted px-1 font-mono">N</kbd> anywhere to start a new task.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
