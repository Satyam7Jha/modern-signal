"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MAX_FILE_BYTES, rejectedRowsToCsv, type RejectedRow } from "@/lib/csv-import";
import type { ImportResponse } from "@/app/api/import/route";

type State =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "error"; message: string }
  | { kind: "done"; fileName: string; importedCount: number; rejected: RejectedRow[] };

export function ImportForm() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");

    if (!(file instanceof File) || file.size === 0) {
      setState({ kind: "error", message: "Choose a CSV file first." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setState({ kind: "error", message: "The file is larger than 1 MB." });
      return;
    }

    setState({ kind: "uploading" });
    try {
      const response = await fetch("/api/import", { method: "POST", body: new FormData(form) });
      const body = (await response.json()) as ImportResponse;

      if ("error" in body) {
        setState({ kind: "error", message: body.error });
        return;
      }
      setState({ kind: "done", fileName: file.name, ...body });
      form.reset();
      router.refresh(); // so the task list is fresh when the user goes back
    } catch {
      setState({ kind: "error", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="card flex flex-wrap items-center gap-3 p-5">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
        />
        <button type="submit" disabled={state.kind === "uploading"} className="btn-primary">
          {state.kind === "uploading" ? "Importing…" : "Import"}
        </button>
      </form>

      {state.kind === "uploading" && (
        <p aria-live="polite" className="text-sm text-slate-500">
          Checking every row and importing the valid ones…
        </p>
      )}

      {state.kind === "error" && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.kind === "done" && <ImportResult {...state} />}
    </div>
  );
}

function ImportResult({ fileName, importedCount, rejected }: Extract<State, { kind: "done" }>) {
  function downloadRejected() {
    const blob = new Blob([rejectedRowsToCsv(rejected)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.replace(/\.csv$/i, "") + "-rejected.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-live="polite" className="space-y-3">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <p className="mr-auto text-sm">
          <span className="font-semibold text-emerald-700">
            Imported {importedCount} {importedCount === 1 ? "task" : "tasks"}
          </span>
          {rejected.length > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-red-700">
                {rejected.length} {rejected.length === 1 ? "row" : "rows"} rejected
              </span>
            </>
          )}
        </p>
        {rejected.length > 0 && (
          <button type="button" onClick={downloadRejected} className="btn">
            Download rejected rows (CSV)
          </button>
        )}
        <Link href="/" className="btn">
          View tasks
        </Link>
      </div>

      {rejected.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Row</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rejected.map((row) => (
                <tr key={row.rowNumber} className="align-top">
                  <td className="px-4 py-2 font-mono">{row.rowNumber}</td>
                  <td className="px-4 py-2 text-red-700">{row.reason}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-slate-600" title={row.values.title}>
                    {row.values.title || <span className="text-slate-400 italic">(empty)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
