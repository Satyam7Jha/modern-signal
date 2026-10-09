"use client";

import {
  AlertCircleIcon,
  CircleCheckIcon,
  CircleXIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ListTodoIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent, type FormEvent } from "react";
import type { ImportResponse } from "@/app/api/import/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CSV_COLUMNS, MAX_FILE_BYTES, rejectedRowsToCsv, type RejectedRow } from "@/lib/csv-import";
import { cn } from "@/lib/utils";

type Result = { fileName: string; importedCount: number; rejected: RejectedRow[] };

const TEMPLATE_CSV = [
  CSV_COLUMNS.join(","),
  'Send the weekly report,2026-10-16,2,"Include sales, support and churn numbers"',
  "Book dentist appointment,2026-10-20,4,",
].join("\r\n");

export function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function chooseFile(next: File | null | undefined) {
    setError(null);
    if (!next) return;
    if (next.size > MAX_FILE_BYTES) {
      setError("The file is larger than 1 MB.");
      return;
    }
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body });
      const data = (await response.json()) as ImportResponse;

      if ("error" in data) {
        setError(data.error);
        return;
      }
      setResult({ fileName: file.name, ...data });
      setFile(null);
      router.refresh(); // so the task list is fresh when the user goes back
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Upload a CSV</CardTitle>
            <CardDescription>Up to 1 MB and {(5000).toLocaleString()} rows.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors hover:bg-muted/50",
                  dragging && "border-primary bg-muted/50",
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <UploadCloudIcon className="size-5 text-muted-foreground" />
                </span>
                <span className="text-sm font-medium">Drop a CSV here, or click to browse</span>
                <span className="text-xs text-muted-foreground">Columns: {CSV_COLUMNS.join(", ")}</span>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0]);
                    event.target.value = ""; // allow picking the same file again
                  }}
                />
              </label>

              {file && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                  <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => setFile(null)}>
                    <XIcon />
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Import failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={!file || uploading}>
                  {uploading ? <Spinner /> : <UploadCloudIcon />}
                  {uploading ? "Importing…" : "Import tasks"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File format</CardTitle>
            <CardDescription>The first row must be the header.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="space-y-2 text-muted-foreground">
              <FormatRule column="title">required, up to 200 characters</FormatRule>
              <FormatRule column="due_date">a real date as YYYY-MM-DD</FormatRule>
              <FormatRule column="priority">whole number, 1 (urgent) to 5</FormatRule>
              <FormatRule column="notes">optional</FormatRule>
            </ul>
            <p className="text-muted-foreground">
              A row is a <span className="font-medium text-foreground">duplicate</span> if a task with the same title
              (ignoring case) and due date is already in the file or in your account.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => downloadCsv(TEMPLATE_CSV, "tasks-template.csv")}
            >
              <FileTextIcon /> Download template
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && <ImportResult {...result} />}
    </div>
  );
}

function ImportResult({ fileName, importedCount, rejected }: Result) {
  const total = importedCount + rejected.length;

  return (
    <section aria-live="polite" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={CircleCheckIcon} label="Imported" value={importedCount} className="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={CircleXIcon} label="Rejected" value={rejected.length} className={rejected.length ? "text-destructive" : undefined} />
        <Stat icon={ListTodoIcon} label="Rows in file" value={total} />
      </div>

      {rejected.length === 0 ? (
        <Alert>
          <CircleCheckIcon />
          <AlertTitle>Every row was imported</AlertTitle>
          <AlertDescription>
            <Link href="/" className="underline underline-offset-4">
              View your tasks
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Rejected rows</CardTitle>
            <CardDescription>
              Row numbers match your spreadsheet (the header is row 1). Fix these rows and upload them again.
            </CardDescription>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv(rejectedRowsToCsv(rejected), fileName.replace(/\.csv$/i, "") + "-rejected.csv")}
              >
                <DownloadIcon /> Download CSV
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 pl-6">Row</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="hidden pr-6 md:table-cell">Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejected.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="pl-6 align-top">
                      <Badge variant="outline" className="font-mono">
                        {row.rowNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal text-destructive">{row.reason}</TableCell>
                    <TableCell className="hidden max-w-64 truncate pr-6 text-muted-foreground md:table-cell" title={row.values.title}>
                      {row.values.title || <span className="italic">empty</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof CircleCheckIcon;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <Icon className={cn("size-5 text-muted-foreground", className)} />
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FormatRule({ column, children }: { column: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col">
      <code className="w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{column}</code>
      <span className="mt-0.5">{children}</span>
    </li>
  );
}

function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
