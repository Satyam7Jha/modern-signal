import type { Metadata } from "next";
import { createTask } from "../actions";
import { TaskForm } from "../task-form";

export const metadata: Metadata = { title: "New task · Task List" };

export default function NewTaskPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New task</h1>
      <TaskForm action={createTask} submitLabel="Create task" />
    </div>
  );
}
