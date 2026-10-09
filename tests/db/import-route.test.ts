import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { POST, type ImportResponse } from "@/app/api/import/route";
import { DUPLICATE_IN_ACCOUNT_REASON } from "@/lib/csv-import";
import { anonClient, assertSupabaseIsRunning, createTestUser } from "./helpers";

// Calls the real POST /api/import handler against the local database. The
// only stand-in is the Supabase client: in the app it reads the session from
// Next's request cookies, here it is a client already signed in as a test user.
const session = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));

async function upload(csv: string): Promise<{ status: number; body: ImportResponse }> {
  const form = new FormData();
  form.append("file", new File([csv], "tasks.csv", { type: "text/csv" }));
  const response = await POST(new Request("http://localhost/api/import", { method: "POST", body: form }));
  return { status: response.status, body: await response.json() };
}

function csvOf(count: number, firstNumber = 1): string {
  const rows = Array.from({ length: count }, (_, i) => `Bulk task ${firstNumber + i},2026-11-15,3,`);
  return ["title,due_date,priority,notes", ...rows].join("\n");
}

const edgeCases = readFileSync(new URL("../../samples/edge-cases.csv", import.meta.url), "utf8");

describe("POST /api/import", () => {
  beforeAll(assertSupabaseIsRunning);

  it("refuses signed-out requests", async () => {
    session.client = anonClient();
    const { status, body } = await upload(edgeCases);
    expect(status).toBe(401);
    expect(body).toHaveProperty("error");
  });

  it("imports the edge-case sample, then reports the same rows as duplicates on re-upload", async () => {
    session.client = (await createTestUser("route-edge-cases")).client;

    const first = await upload(edgeCases);
    expect(first.status).toBe(200);
    if ("error" in first.body) throw new Error(first.body.error);
    expect(first.body.importedCount).toBe(3);
    expect(first.body.rejected.map((row) => row.rowNumber)).toEqual([4, 5, 6, 7, 8]);

    const second = await upload(edgeCases);
    if ("error" in second.body) throw new Error(second.body.error);
    expect(second.body.importedCount).toBe(0);
    expect(second.body.rejected.map((row) => row.rowNumber)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(second.body.rejected.filter((row) => row.reason === DUPLICATE_IN_ACCOUNT_REASON).map((row) => row.rowNumber)).toEqual([
      2, 3, 9,
    ]);
  });

  it("counts imports and duplicates correctly above 1,000 rows", async () => {
    session.client = (await createTestUser("route-bulk")).client;

    const first = await upload(csvOf(1500));
    if ("error" in first.body) throw new Error(first.body.error);
    expect(first.body.importedCount).toBe(1500);
    expect(first.body.rejected).toEqual([]);

    // Rows 1–1,500 already exist; rows 1,501–2,000 are new.
    const second = await upload(csvOf(2000));
    if ("error" in second.body) throw new Error(second.body.error);
    expect(second.body.importedCount).toBe(500);
    expect(second.body.rejected).toHaveLength(1500);
    expect(second.body.rejected.every((row) => row.reason === DUPLICATE_IN_ACCOUNT_REASON)).toBe(true);

    const { count } = await session.client.from("tasks").select("id", { count: "exact", head: true });
    expect(count).toBe(2000);
  });

  it("rejects files over 1 MB without reading them", async () => {
    session.client = (await createTestUser("route-large")).client;
    const { status, body } = await upload(`title,due_date,priority,notes\n${"x".repeat(1024 * 1024)}`);
    expect(status).toBe(413);
    expect(body).toEqual({ error: "The file is larger than 1 MB." });
  });
});
