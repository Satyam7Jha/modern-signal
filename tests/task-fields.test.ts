import { describe, expect, it } from "vitest";
import { isValidIsoDate, parsePriority, titleError } from "@/lib/task-fields";

describe("titleError", () => {
  it("requires a title", () => {
    expect(titleError("")).toBe("Title is required");
  });

  it("accepts exactly 200 characters and rejects 201", () => {
    expect(titleError("a".repeat(200))).toBeNull();
    expect(titleError("a".repeat(201))).toMatch(/200 characters or fewer \(it has 201\)/);
  });

  it("counts an emoji as one character, like Postgres does", () => {
    // 200 emoji are 400 UTF-16 code units but 200 characters.
    expect(titleError("🙂".repeat(200))).toBeNull();
  });
});

describe("isValidIsoDate", () => {
  it.each(["2026-10-09", "2024-02-29", "2026-12-31"])("accepts %s", (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each([
    ["2026-02-30", "day that does not exist"],
    ["2025-02-29", "Feb 29 in a non-leap year"],
    ["2026-13-01", "month 13"],
    ["2026-1-5", "missing zero padding"],
    ["10/09/2026", "US format"],
    ["2026-10-09T00:00:00Z", "timestamp"],
    ["", "empty"],
    ["tomorrow", "words"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe("parsePriority", () => {
  it.each(["1", "2", "3", "4", "5"])("accepts %s", (value) => {
    expect(parsePriority(value)).toBe(Number(value));
  });

  it.each(["0", "6", "high", "3.5", "3.0", "-1", "", "1e0", " 3", "03"])(
    "rejects %j",
    (value) => {
      expect(parsePriority(value)).toBeNull();
    },
  );
});
