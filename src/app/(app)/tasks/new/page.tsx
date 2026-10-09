import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { createTask } from "../actions";
import { TaskForm } from "../task-form";

export const metadata: Metadata = { title: "New task · Task List" };

export default function NewTaskPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title="New task" description="Add a task with a due date and priority." />
      <TaskForm action={createTask} submitLabel="Create task" />
    </div>
  );
}
