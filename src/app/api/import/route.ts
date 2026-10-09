import { MAX_FILE_BYTES, finishImport, prepareImport, type RejectedRow } from "@/lib/csv-import";
import { createClient } from "@/lib/supabase/server";

export type ImportResponse =
  | { importedCount: number; rejected: RejectedRow[] }
  | { error: string };

const json = (body: ImportResponse, status = 200) => Response.json(body, { status });

/**
 * POST /api/import with multipart form data containing `file`.
 *
 * 1. Check the session (the proxy skips /api, so this route does it itself).
 * 2. Parse and validate every row and drop duplicates within the file (pure code in lib/csv-import).
 * 3. Insert the valid rows in one transaction via the import_tasks SQL function,
 *    which also skips rows that already exist in the account.
 * 4. Return the number imported and every rejected row with its reason.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Your session has expired. Sign in again to import tasks." }, 401);

  // Refuse oversized uploads before reading the body into memory.
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_FILE_BYTES + 64 * 1024) return json({ error: "The file is larger than 1 MB." }, 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return json({ error: "Upload a CSV file using the form." }, 400);
  }
  if (!(file instanceof File) || file.size === 0) return json({ error: "Choose a non-empty CSV file to upload." }, 400);
  if (file.size > MAX_FILE_BYTES) return json({ error: "The file is larger than 1 MB." }, 413);

  const prepared = prepareImport(await file.text());
  if (!prepared.ok) return json({ error: prepared.error }, 400);

  let importedRowNumbers: number[] = [];
  if (prepared.valid.length > 0) {
    const { data, error } = await supabase.rpc("import_tasks", {
      rows: prepared.valid.map((row) => ({
        row_number: row.rowNumber,
        title: row.title,
        notes: row.notes,
        due_date: row.due_date,
        priority: row.priority,
      })),
    });

    if (error) {
      console.error("import_tasks failed", error);
      // The function runs in one transaction, so a failure means nothing was saved.
      return json({ error: "The import failed and no tasks were added. Please try again." }, 500);
    }
    importedRowNumbers = data;
  }

  return json(finishImport(prepared.valid, prepared.rejected, importedRowNumbers));
}
