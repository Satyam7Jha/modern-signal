import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DUPLICATE_IN_ACCOUNT_REASON,
  MAX_DATA_ROWS,
  finishImport,
  prepareImport,
  rejectedRowsToCsv,
  type PreparedImport,
} from "@/lib/csv-import";

const HEADER = "title,due_date,priority,notes";

function prepared(text: string) {
  const result: PreparedImport = prepareImport(text);
  if (!result.ok) throw new Error(`Expected a parsed file, got: ${result.error}`);
  return result;
}

const reasonFor = (result: ReturnType<typeof prepared>, rowNumber: number) =>
  result.rejected.find((row) => row.rowNumber === rowNumber)?.reason;

describe("prepareImport: parsing", () => {
  it("keeps commas inside quoted values and unescapes doubled quotes", () => {
    const result = prepared(`${HEADER}\nPack,2026-10-10,2,"Shoes, socks, and a ""good"" jacket"`);
    expect(result.rejected).toEqual([]);
    expect(result.valid[0].notes).toBe('Shoes, socks, and a "good" jacket');
  });

  it("handles Windows line endings without leaving \\r in values", () => {
    const result = prepared(`${HEADER}\r\nA,2026-10-10,1,first\r\nB,2026-10-11,2,"multi\r\nline"\r\n`);
    expect(result.rejected).toEqual([]);
    expect(result.valid.map((row) => row.notes)).toEqual(["first", "multi\nline"]);
  });

  it("reports blank rows in the middle but ignores trailing blank lines", () => {
    const result = prepared(`${HEADER}\nA,2026-10-10,1,\n\n , , , \nB,2026-10-11,2,\n\n\n`);
    expect(result.valid.map((row) => row.rowNumber)).toEqual([2, 5]);
    expect(result.rejected).toEqual([
      expect.objectContaining({ rowNumber: 3, reason: "Row is empty" }),
      expect.objectContaining({ rowNumber: 4, reason: "Row is empty" }),
    ]);
  });

  it("numbers rows like a spreadsheet even when a quoted value spans lines", () => {
    const result = prepared(`${HEADER}\nA,2026-10-10,1,"line 1\nline 2"\nB,2026-10-11,high,`);
    expect(result.valid[0].rowNumber).toBe(2);
    expect(result.rejected[0].rowNumber).toBe(3);
  });

  it("accepts headers in any order and case, with a BOM, and without a notes column", () => {
    const result = prepared(`﻿ Priority ,TITLE,Due_Date\n3,Read,2026-10-10`);
    expect(result.valid).toEqual([
      { rowNumber: 2, title: "Read", due_date: "2026-10-10", priority: 3, notes: null },
    ]);
  });

  it("trims spaces around values", () => {
    const result = prepared(`${HEADER}\n  Read  , 2026-10-10 , 3 ,  some notes  `);
    expect(result.valid[0]).toMatchObject({ title: "Read", due_date: "2026-10-10", priority: 3, notes: "some notes" });
  });

  it("rejects a row with an unquoted comma instead of shifting its values", () => {
    const result = prepared(`${HEADER}\nBuy milk, eggs,2026-10-10,3,notes`);
    expect(result.valid).toEqual([]);
    expect(reasonFor(result, 2)).toMatch(/more values than the header/);
  });

  it("rejects the row where an unclosed quote starts and keeps earlier rows", () => {
    const result = prepared(`${HEADER}\nGood,2026-10-10,1,\n"Broken,2026-10-11,2,\nLater,2026-10-12,3,`);
    expect(result.valid.map((row) => row.title)).toEqual(["Good"]);
    expect(reasonFor(result, 3)).toMatch(/Unclosed quote/);
  });
});

describe("prepareImport: file-level errors", () => {
  it.each([
    ["", "The file is empty."],
    ["\r\n\r\n", "The file is empty."],
    [HEADER, "The file has a header row but no data rows."],
  ])("rejects %j", (text, error) => {
    expect(prepareImport(text)).toEqual({ ok: false, error });
  });

  it("names the missing required columns", () => {
    const result = prepareImport("title,notes\nA,b");
    expect(result).toEqual({ ok: false, error: expect.stringContaining("due_date, priority") });
  });

  it("refuses files over the row limit", () => {
    const rows = Array.from({ length: MAX_DATA_ROWS + 1 }, (_, i) => `T${i},2026-10-10,1,`);
    const result = prepareImport([HEADER, ...rows].join("\n"));
    expect(result.ok).toBe(false);
  });
});

describe("prepareImport: validation", () => {
  it("rejects each invalid field with a specific reason", () => {
    const result = prepared(
      [
        HEADER,
        ",2026-10-10,1,missing title",
        `${"x".repeat(201)},2026-10-10,1,long title`,
        "Bad date,2026-02-30,1,",
        "Wrong format,10/10/2026,1,",
        "No date,,1,",
        "Word priority,2026-10-10,high,",
        "Decimal priority,2026-10-10,2.5,",
        "Out of range,2026-10-10,6,",
        "No priority,2026-10-10,,",
        `Long notes,2026-10-10,1,${"n".repeat(5001)}`,
      ].join("\n"),
    );

    expect(result.valid).toEqual([]);
    expect(reasonFor(result, 2)).toBe("Title is required");
    expect(reasonFor(result, 3)).toBe("Title must be 200 characters or fewer (it has 201)");
    expect(reasonFor(result, 4)).toBe('Due date "2026-02-30" is not a valid YYYY-MM-DD date');
    expect(reasonFor(result, 5)).toBe('Due date "10/10/2026" is not a valid YYYY-MM-DD date');
    expect(reasonFor(result, 6)).toBe("Due date is required (YYYY-MM-DD)");
    expect(reasonFor(result, 7)).toBe('Priority "high" is not a whole number from 1 to 5');
    expect(reasonFor(result, 8)).toBe('Priority "2.5" is not a whole number from 1 to 5');
    expect(reasonFor(result, 9)).toBe('Priority "6" is not a whole number from 1 to 5');
    expect(reasonFor(result, 10)).toBe("Priority is required (a whole number from 1 to 5)");
    expect(reasonFor(result, 11)).toBe("Notes must be 5,000 characters or fewer (they have 5,001)");
  });

  it("lists every problem in a row, not just the first", () => {
    const result = prepared(`${HEADER}\n,not-a-date,high,`);
    expect(reasonFor(result, 2)).toBe(
      'Title is required; Due date "not-a-date" is not a valid YYYY-MM-DD date; Priority "high" is not a whole number from 1 to 5',
    );
  });

  it("stores empty notes as null", () => {
    expect(prepared(`${HEADER}\nA,2026-10-10,1,`).valid[0].notes).toBeNull();
  });
});

describe("duplicate handling", () => {
  it("keeps the first occurrence in the file and rejects later ones", () => {
    const result = prepared(
      [HEADER, "Pay rent,2026-11-01,1,", "Pay rent,2026-11-01,3,again", "Pay rent,2026-12-01,1,next month"].join("\n"),
    );
    expect(result.valid.map((row) => row.rowNumber)).toEqual([2, 4]);
    expect(reasonFor(result, 3)).toBe("Duplicate: same title and due date as row 2 in this file");
  });

  it("matches titles ignoring case and surrounding spaces", () => {
    const result = prepared([HEADER, "Pay Rent,2026-11-01,1,", "  pay rent ,2026-11-01,1,"].join("\n"));
    expect(reasonFor(result, 3)).toMatch(/Duplicate: same title and due date as row 2/);
  });

  it("does not treat an invalid row as the original of a later duplicate", () => {
    const result = prepared([HEADER, "Pay rent,2026-11-01,high,", "Pay rent,2026-11-01,1,"].join("\n"));
    expect(result.valid.map((row) => row.rowNumber)).toEqual([3]);
  });

  it("finishImport marks rows the database skipped as duplicates in the account", () => {
    const { valid, rejected } = prepared(
      [HEADER, "Existing,2026-11-01,1,", "New,2026-11-02,2,", "Bad,2026-11-03,9,"].join("\n"),
    );
    // The database inserted row 3 only; row 2 matched a task already in the account.
    const result = finishImport(valid, rejected, [3]);

    expect(result.importedCount).toBe(1);
    expect(result.rejected).toEqual([
      expect.objectContaining({ rowNumber: 2, reason: DUPLICATE_IN_ACCOUNT_REASON }),
      expect.objectContaining({ rowNumber: 4 }),
    ]);
  });
});

describe("rejectedRowsToCsv", () => {
  it("includes the row number and reason and quotes values with commas", () => {
    const csv = rejectedRowsToCsv([
      {
        rowNumber: 7,
        reason: 'Priority "high" is not a whole number from 1 to 5',
        values: { title: "Report, Q3", due_date: "2026-10-31", priority: "high", notes: "" },
      },
    ]);
    expect(csv).toBe(
      'row_number,reason,title,due_date,priority,notes\r\n7,"Priority ""high"" is not a whole number from 1 to 5","Report, Q3",2026-10-31,high,',
    );
  });

  it("neutralises values a spreadsheet would run as formulas", () => {
    const csv = rejectedRowsToCsv([
      { rowNumber: 2, reason: "x", values: { title: "=HYPERLINK(1)", due_date: "", priority: "-1", notes: "@cmd" } },
    ]);
    expect(csv.split("\r\n")[1]).toBe("2,x,'=HYPERLINK(1),,'-1,'@cmd");
  });
});

describe("the edge-case sample file (samples/edge-cases.csv)", () => {
  const text = readFileSync(new URL("../samples/edge-cases.csv", import.meta.url), "utf8");

  it("is saved with Windows line endings", () => {
    expect(text).toContain("\r\n");
  });

  it("imports the valid rows and reports every bad row with a reason", () => {
    const result = prepared(text);

    expect(result.valid.map((row) => row.title)).toEqual([
      "Buy groceries",
      "Call the dentist",
      "Plan team offsite",
    ]);
    expect(result.valid[0].notes).toBe("Milk, eggs, and bread");
    expect(result.valid[2].notes).toBe('Agenda: "kickoff", workshops, dinner');

    expect(result.rejected.map(({ rowNumber, reason }) => [rowNumber, reason])).toEqual([
      [4, "Duplicate: same title and due date as row 2 in this file"],
      [5, "Row is empty"],
      [6, 'Priority "high" is not a whole number from 1 to 5'],
      [7, "Title must be 200 characters or fewer (it has 212)"],
      [8, 'Due date "2026-02-30" is not a valid YYYY-MM-DD date'],
    ]);
  });
});
