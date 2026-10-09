import type { Metadata } from "next";
import { CSV_COLUMNS } from "@/lib/csv-import";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import CSV · Task List" };

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Import tasks from CSV</h1>

      <div className="card space-y-2 p-5 text-sm text-slate-600">
        <p>
          The first row must be a header with the columns{" "}
          {CSV_COLUMNS.map((column, i) => (
            <span key={column}>
              <code className="rounded bg-slate-100 px-1 text-slate-800">{column}</code>
              {i < CSV_COLUMNS.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          (<code className="rounded bg-slate-100 px-1 text-slate-800">notes</code> is optional).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Title is required, up to 200 characters.</li>
          <li>Due date must be a real date written as YYYY-MM-DD.</li>
          <li>Priority must be a whole number from 1 (highest) to 5 (lowest).</li>
          <li>
            A row is a duplicate if a task with the same title (ignoring case) and due date is already in the
            file or in your account.
          </li>
        </ul>
        <p>Valid rows are imported together; every other row is listed with the reason so you can fix and re-upload it.</p>
      </div>

      <ImportForm />
    </div>
  );
}
