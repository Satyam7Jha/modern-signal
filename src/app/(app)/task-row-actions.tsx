"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTask, setTaskStatus, type RowActionResult } from "./tasks/actions";

export function TaskRowActions({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<RowActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        {confirmingDelete ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteTask(taskId))}
              className="btn border-red-300 text-red-700 hover:bg-red-50"
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirmingDelete(false)} className="btn">
              Keep
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setTaskStatus(taskId, done ? "todo" : "done"))}
              className="btn"
            >
              {done ? "Reopen" : "Complete"}
            </button>
            <Link href={`/tasks/${taskId}/edit`} className="btn">
              Edit
            </Link>
            <button type="button" onClick={() => setConfirmingDelete(true)} className="btn text-red-700">
              Delete
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
