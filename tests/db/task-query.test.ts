import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/database.types";
import { queryTasks } from "@/lib/task-query";
import { getTaskSummary } from "@/lib/task-summary";
import { isoDate, parseFilters } from "@/lib/tasks";
import { assertSupabaseIsRunning, createTestUser } from "./helpers";

// The list query, search and the sidebar counts, run as a real user against
// the local database. getTaskSummary normally gets its client from the
// request cookies; here it gets one signed in as the test user.
const session = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));

const today = isoDate();

describe("task search", () => {
  let client: SupabaseClient<Database>;

  beforeAll(async () => {
    await assertSupabaseIsRunning();
    client = (await createTestUser("search")).client as SupabaseClient<Database>;
    const { error } = await client.from("tasks").insert([
      { title: "bulk 1", due_date: "2026-11-01", priority: 3, notes: null },
      { title: "b*k 1", due_date: "2026-11-01", priority: 3, notes: null },
      { title: "50% off", due_date: "2026-11-01", priority: 3, notes: null },
      { title: "Rename user_id", due_date: "2026-11-01", priority: 3, notes: null },
      { title: "Write report", due_date: "2026-11-01", priority: 3, notes: "Section (draft) [v2]" },
    ]);
    if (error) throw error;
  });

  async function search(q: string) {
    const { data, error } = await queryTasks(client, parseFilters({ q }), { columns: "title" })
      .order("title")
      .overrideTypes<{ title: string }[], { merge: false }>();
    if (error) throw error;
    return data.map((task) => task.title);
  }

  it("matches * literally, not as a wildcard", async () => {
    expect(await search("b*k 1")).toEqual(["b*k 1"]);
  });

  it("matches %, _ and regex characters literally", async () => {
    expect(await search("50%")).toEqual(["50% off"]);
    expect(await search("r_i")).toEqual(["Rename user_id"]);
    expect(await search("(draft) [v2]")).toEqual(["Write report"]);
    expect(await search(".*")).toEqual([]);
  });

  it("ignores case and searches notes too", async () => {
    expect(await search("BULK")).toEqual(["bulk 1"]);
    expect(await search("draft")).toEqual(["Write report"]);
  });
});

describe("task counts", () => {
  beforeAll(async () => {
    await assertSupabaseIsRunning();
    const user = await createTestUser("counts");
    session.client = user.client;

    // More tasks than the API returns in one response (1,000), all due later.
    const rows = Array.from({ length: 1200 }, (_, i) => ({
      row_number: i + 2,
      title: `Later task ${i + 1}`,
      due_date: isoDate(30),
      priority: 3,
    }));
    const imported = await user.client.rpc("import_tasks", { rows });
    if (imported.error) throw imported.error;

    // A bulk insert sends the same columns for every row, so each row sets status.
    const { error } = await user.client.from("tasks").insert([
      { title: "Late", due_date: isoDate(-2), priority: 1, status: "todo" },
      { title: "Late but finished", due_date: isoDate(-2), priority: 1, status: "done" },
      { title: "Due now", due_date: today, priority: 2, status: "in_progress" },
      { title: "This week", due_date: isoDate(3), priority: 2, status: "todo" },
    ]);
    if (error) throw error;
  });

  it("counts every task, beyond the API's 1,000-row response cap", async () => {
    expect(await getTaskSummary()).toEqual({
      all: 1204,
      open: 1203,
      today: 1,
      week: 2, // due today and in 3 days
      overdue: 1, // the finished late task is not overdue
      in_progress: 1,
      done: 1,
    });
  });

  it("gives the list the full count even though it returns at most 500 rows", async () => {
    const { data, count } = await queryTasks(session.client as SupabaseClient<Database>, parseFilters({})).limit(500);
    expect(data).toHaveLength(500);
    expect(count).toBe(1204);
  });
});
