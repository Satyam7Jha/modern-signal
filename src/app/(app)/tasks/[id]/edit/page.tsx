import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { TASK_COLUMNS, type Task } from "@/lib/tasks";
import { updateTask } from "../../actions";
import { TaskForm } from "../../task-form";

export const metadata: Metadata = { title: "Edit task · Task List" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditTaskPage({ params }: PageProps<"/tasks/[id]/edit">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<Task | null, { merge: false }>();

  if (error) throw new Error("Could not load the task.");
  // Another user's task id is indistinguishable from a missing one: RLS hides it.
  if (!data) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title="Edit task" description="Update the details, or change its status." />
      <TaskForm action={updateTask.bind(null, data.id)} task={data} submitLabel="Save changes" />
    </div>
  );
}
