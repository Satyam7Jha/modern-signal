import { describe, expect, it } from "vitest";
import { escapeRegExp, groupTasks, parseFilters, relativeDue, type Task } from "@/lib/tasks";

const TODAY = "2026-10-09";

function task(id: string, due_date: string, status: Task["status"] = "todo"): Task {
  return { id, title: id, notes: null, due_date, priority: 3, status, created_at: "2026-10-01T00:00:00Z" };
}

describe("parseFilters", () => {
  it("keeps valid filters", () => {
    expect(parseFilters({ q: " milk ", status: "done", priority: "2", due: "overdue" })).toEqual({
      q: "milk",
      status: "done",
      priority: 2,
      due: "overdue",
    });
  });

  it("drops values that are not real options instead of passing them to the query", () => {
    expect(parseFilters({ status: "deleted", priority: "9", due: "someday" })).toEqual({
      q: "",
      status: "",
      priority: null,
      due: "",
    });
  });
});

describe("escapeRegExp", () => {
  it("escapes regex special characters so they match literally", () => {
    expect(escapeRegExp("b*k (a+b)? [x] ^$ . | \\")).toBe("b\\*k \\(a\\+b\\)\\? \\[x\\] \\^\\$ \\. \\| \\\\");
  });

  it("leaves LIKE wildcards alone, since they are not special in a regex", () => {
    expect(escapeRegExp("100%_done")).toBe("100%_done");
  });
});

describe("relativeDue", () => {
  it.each([
    ["2026-10-09", "Today"],
    ["2026-10-10", "Tomorrow"],
    ["2026-10-08", "Yesterday"],
    ["2026-10-12", "In 3 days"],
    ["2026-10-06", "3 days ago"],
    ["2026-11-20", "Nov 20"],
    ["2027-01-05", "Jan 5, 2027"],
  ])("labels %s as %s", (due, label) => {
    expect(relativeDue(due, TODAY)).toBe(label);
  });
});

describe("groupTasks", () => {
  it("sorts tasks into sections in a fixed order and skips empty ones", () => {
    const groups = groupTasks(
      [
        task("late", "2026-10-01"),
        task("finished-late", "2026-10-02", "done"),
        task("now", "2026-10-09", "in_progress"),
        task("next", "2026-10-10"),
        task("soon", "2026-10-16"),
        task("someday", "2026-12-01"),
      ],
      TODAY,
    );

    expect(groups.map((group) => [group.id, group.tasks.map((t) => t.id)])).toEqual([
      ["overdue", ["late"]],
      ["today", ["now"]],
      ["tomorrow", ["next"]],
      ["week", ["soon"]],
      ["later", ["someday"]],
      ["done", ["finished-late"]],
    ]);
  });

  it("never shows a completed task as overdue", () => {
    expect(groupTasks([task("old", "2020-01-01", "done")], TODAY)[0].id).toBe("done");
  });
});
