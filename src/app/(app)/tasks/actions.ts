"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isTaskStatus,
  isValidIsoDate,
  notesError,
  parsePriority,
  titleError,
  type TaskStatus,
} from "@/lib/task-fields";

type TaskFields = "title" | "due_date" | "priority" | "status" | "notes";
export type TaskFormValues = Record<TaskFields, string>;
export type TaskFormState = {
  errors: Partial<Record<TaskFields | "form", string>>;
  values: TaskFormValues | null;
};

/** Reads and validates the task form. Returns the clean row or per-field errors. */
function readTaskForm(formData: FormData) {
  const values: TaskFormValues = {
    title: String(formData.get("title") ?? "").trim(),
    due_date: String(formData.get("due_date") ?? "").trim(),
    priority: String(formData.get("priority") ?? "").trim(),
    status: String(formData.get("status") ?? "todo").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  const errors: TaskFormState["errors"] = {};
  const titleProblem = titleError(values.title);
  if (titleProblem) errors.title = titleProblem;
  if (!isValidIsoDate(values.due_date)) errors.due_date = "Choose a valid due date";
  const priority = parsePriority(values.priority);
  if (priority === null) errors.priority = "Priority must be a whole number from 1 to 5";
  if (!isTaskStatus(values.status)) errors.status = "Choose a status";
  const notesProblem = notesError(values.notes);
  if (notesProblem) errors.notes = notesProblem;

  if (Object.keys(errors).length > 0 || priority === null) {
    return { ok: false as const, state: { errors, values } };
  }

  return {
    ok: true as const,
    row: {
      title: values.title,
      due_date: values.due_date,
      priority,
      status: values.status as TaskStatus,
      notes: values.notes || null,
    },
    values,
  };
}

/** Server Actions are public endpoints, so each one checks the session itself. */
async function requireSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

export async function createTask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const form = readTaskForm(formData);
  if (!form.ok) return form.state;

  const supabase = await requireSupabase();
  // user_id is not sent: the column defaults to auth.uid() in the database.
  const { error } = await supabase.from("tasks").insert(form.row);
  if (error) {
    console.error("createTask failed", error);
    return { errors: { form: "Could not save the task. Please try again." }, values: form.values };
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateTask(
  id: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const form = readTaskForm(formData);
  if (!form.ok) return form.state;

  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .update(form.row)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    console.error("updateTask failed", error);
    return { errors: { form: "Could not save the task. Please try again." }, values: form.values };
  }
  // RLS hides other users' tasks, so updating one of them matches no rows.
  if (data.length === 0) {
    return { errors: { form: "This task no longer exists." }, values: form.values };
  }

  revalidatePath("/");
  redirect("/");
}

export type RowActionResult = { error: string | null };

export async function setTaskStatus(id: string, status: TaskStatus): Promise<RowActionResult> {
  if (!isTaskStatus(status)) return { error: "Unknown status." };

  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");

  if (error || data.length === 0) {
    if (error) console.error("setTaskStatus failed", error);
    return { error: "Could not update the task." };
  }

  revalidatePath("/");
  return { error: null };
}

/** Soft delete: the row stays in the database with deleted_at set. */
export async function deleteTask(id: string): Promise<RowActionResult> {
  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");

  if (error || data.length === 0) {
    if (error) console.error("deleteTask failed", error);
    return { error: "Could not delete the task." };
  }

  revalidatePath("/");
  return { error: null };
}

/** Undo for a soft delete: clears deleted_at again. */
export async function restoreTask(id: string): Promise<RowActionResult> {
  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id");

  if (error || data.length === 0) {
    if (error) console.error("restoreTask failed", error);
    return { error: "Could not restore the task." };
  }

  revalidatePath("/");
  return { error: null };
}
