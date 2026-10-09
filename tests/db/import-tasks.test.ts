import { beforeAll, describe, expect, it } from "vitest";
import { assertSupabaseIsRunning, createTestUser, type TestUser } from "./helpers";

// The import_tasks SQL function checks duplicates against tasks already in the
// account and inserts the rest in one transaction. These tests run it on the
// local database as real users.

type Row = { row_number: number; title: string; due_date: string; priority: number; notes?: string | null };

async function importRows(user: TestUser, rows: Row[]) {
  const { data, error } = await user.client.rpc("import_tasks", { rows });
  if (error) throw error;
  return data as number[];
}

async function titles(user: TestUser) {
  const { data } = await user.client.from("tasks").select("title").is("deleted_at", null).order("title");
  return data?.map((task) => task.title);
}

describe("import_tasks (database)", () => {
  let user: TestUser;

  beforeAll(async () => {
    await assertSupabaseIsRunning();
    user = await createTestUser("importer");
    await user.client.from("tasks").insert({ title: "Pay rent", due_date: "2026-11-01", priority: 1 });
  });

  it("imports new rows and skips ones that already exist in the account", async () => {
    const imported = await importRows(user, [
      { row_number: 2, title: "PAY RENT", due_date: "2026-11-01", priority: 2 }, // same task, different case
      { row_number: 3, title: "Pay rent", due_date: "2026-12-01", priority: 1 }, // different date: not a duplicate
      { row_number: 4, title: "Book flights", due_date: "2026-11-05", priority: 3, notes: "Window seat, please" },
    ]);

    expect(imported).toEqual([3, 4]);
    expect(await titles(user)).toEqual(["Book flights", "Pay rent", "Pay rent"]);
  });

  it("re-importing the same file adds nothing", async () => {
    const imported = await importRows(user, [
      { row_number: 2, title: "Book flights", due_date: "2026-11-05", priority: 3 },
    ]);
    expect(imported).toEqual([]);
  });

  it("does not count soft-deleted tasks as duplicates", async () => {
    const { data } = await user.client
      .from("tasks")
      .insert({ title: "Old idea", due_date: "2026-11-10", priority: 5 })
      .select("id")
      .single();
    await user.client.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", data!.id);

    const imported = await importRows(user, [{ row_number: 2, title: "Old idea", due_date: "2026-11-10", priority: 5 }]);
    expect(imported).toEqual([2]);
  });

  it("only checks for duplicates within the caller's own account", async () => {
    const other = await createTestUser("other-importer");
    const imported = await importRows(other, [{ row_number: 2, title: "Pay rent", due_date: "2026-11-01", priority: 1 }]);

    expect(imported).toEqual([2]); // the first user's "Pay rent" is invisible to this user
    expect(await titles(other)).toEqual(["Pay rent"]);
  });

  it("reports every imported row, beyond the API's 1,000-row response cap", async () => {
    // PostgREST returns at most max_rows (1,000) rows from a query or a
    // set-returning function. Use more than that so a capped response fails.
    const bulk = await createTestUser("bulk-importer");
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      row_number: i + 2,
      title: `Bulk task ${i + 1}`,
      due_date: "2026-11-15",
      priority: 3,
    }));

    const imported = await importRows(bulk, rows);
    expect(imported).toHaveLength(1500);
    expect(imported[1499]).toBe(1501);

    const { count } = await bulk.client.from("tasks").select("id", { count: "exact", head: true });
    expect(count).toBe(1500);
  });

  it("is all-or-nothing: one bad row rolls back the whole batch", async () => {
    const before = await titles(user);
    // Bypass the app's validation to prove the database transaction is atomic.
    const { error } = await user.client.rpc("import_tasks", {
      rows: [
        { row_number: 2, title: "Would be fine", due_date: "2026-11-20", priority: 2 },
        { row_number: 3, title: "Priority out of range", due_date: "2026-11-21", priority: 9 },
      ],
    });

    expect(error).not.toBeNull();
    expect(await titles(user)).toEqual(before);
  });
});
