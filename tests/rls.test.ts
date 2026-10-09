import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, assertSupabaseIsRunning, createTestUser, type TestUser } from "./helpers/supabase";

// Runs against the local Supabase stack. Alice and Bob are real users signed
// in through Supabase Auth; every query below is filtered by the RLS policies
// in supabase/migrations.

describe("row-level security on tasks", () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceTaskId: string;

  beforeAll(async () => {
    await assertSupabaseIsRunning();
    [alice, bob] = await Promise.all([createTestUser("alice"), createTestUser("bob")]);

    const { data, error } = await alice.client
      .from("tasks")
      .insert({ title: "Alice's private task", due_date: "2026-12-01", priority: 2 })
      .select("id, user_id")
      .single();
    if (error) throw error;
    expect(data.user_id).toBe(alice.userId); // user_id comes from auth.uid(), not the client
    aliceTaskId = data.id;
  });

  it("lets a user read their own tasks", async () => {
    const { data, error } = await alice.client.from("tasks").select("id, title");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: aliceTaskId, title: "Alice's private task" }]);
  });

  it("does not let one user read another user's tasks", async () => {
    const all = await bob.client.from("tasks").select("id");
    expect(all.error).toBeNull();
    expect(all.data).toEqual([]);

    const byId = await bob.client.from("tasks").select("id").eq("id", aliceTaskId);
    expect(byId.data).toEqual([]);
  });

  it("does not let one user edit or complete another user's task", async () => {
    const { data } = await bob.client
      .from("tasks")
      .update({ title: "Hacked", status: "done" })
      .eq("id", aliceTaskId)
      .select("id");
    expect(data).toEqual([]); // no row matched for Bob

    const check = await alice.client.from("tasks").select("title, status").eq("id", aliceTaskId).single();
    expect(check.data).toEqual({ title: "Alice's private task", status: "todo" });
  });

  it("does not let one user soft-delete another user's task", async () => {
    const { data } = await bob.client
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", aliceTaskId)
      .select("id");
    expect(data).toEqual([]);

    const check = await alice.client.from("tasks").select("deleted_at").eq("id", aliceTaskId).single();
    expect(check.data?.deleted_at).toBeNull();
  });

  it("does not let a user create a task owned by someone else", async () => {
    const { error } = await bob.client
      .from("tasks")
      .insert({ user_id: alice.userId, title: "Planted", due_date: "2026-12-01", priority: 1 });
    expect(error).not.toBeNull();

    const aliceTasks = await alice.client.from("tasks").select("title");
    expect(aliceTasks.data?.map((task) => task.title)).not.toContain("Planted");
  });

  it("does not let a user move their task to another account", async () => {
    const own = await bob.client
      .from("tasks")
      .insert({ title: "Bob's task", due_date: "2026-12-02", priority: 3 })
      .select("id")
      .single();
    const { error } = await bob.client.from("tasks").update({ user_id: alice.userId }).eq("id", own.data!.id);
    expect(error).not.toBeNull(); // user_id is not an updatable column
  });

  it("blocks hard deletes, even for the owner (tasks are soft-deleted)", async () => {
    const { error } = await alice.client.from("tasks").delete().eq("id", aliceTaskId);
    expect(error).not.toBeNull();

    const check = await alice.client.from("tasks").select("id").eq("id", aliceTaskId);
    expect(check.data).toHaveLength(1);
  });

  it("returns no tasks to signed-out visitors", async () => {
    const { data } = await anonClient().from("tasks").select("id");
    expect(data ?? []).toEqual([]);
  });
});
