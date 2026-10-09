"use client";

import Link from "next/link";
import { useActionState } from "react";
import { STATUSES, STATUS_LABELS, TITLE_MAX_LENGTH } from "@/lib/task-fields";
import type { Task } from "@/lib/tasks";
import type { TaskFormState, TaskFormValues } from "./actions";

type Props = {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  task?: Task;
  submitLabel: string;
};

const PRIORITY_OPTIONS = [
  { value: "1", label: "1 (highest)" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5 (lowest)" },
];

export function TaskForm({ action, task, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: null });

  // After a failed submit, show what the user typed; otherwise the saved task.
  const values: TaskFormValues = state.values ?? {
    title: task?.title ?? "",
    due_date: task?.due_date ?? "",
    priority: String(task?.priority ?? 3),
    status: task?.status ?? "todo",
    notes: task?.notes ?? "",
  };
  const { errors } = state;

  return (
    <form action={formAction} className="card space-y-4 p-5" noValidate>
      {errors.form && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </p>
      )}

      <Field label="Title" error={errors.title}>
        <input
          name="title"
          defaultValue={values.title}
          maxLength={TITLE_MAX_LENGTH}
          required
          autoFocus
          className="input"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Due date" error={errors.due_date}>
          <input name="due_date" type="date" defaultValue={values.due_date} required className="input" />
        </Field>
        <Field label="Priority" error={errors.priority}>
          <select name="priority" defaultValue={values.priority} className="input">
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={errors.status}>
          <select name="status" defaultValue={values.status} className="input">
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes (optional)" error={errors.notes}>
        <textarea name="notes" rows={4} defaultValue={values.notes} className="input" />
      </Field>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-red-600">{error}</span>}
    </label>
  );
}
