// Field rules shared by the task form and the CSV import, so both paths
// accept and reject exactly the same values. The database repeats the
// title-length, notes-length, priority and status rules as CHECK constraints.

export const TITLE_MAX_LENGTH = 200;
export const NOTES_MAX_LENGTH = 5000;

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function isTaskStatus(value: string): value is TaskStatus {
  return (STATUSES as readonly string[]).includes(value);
}

/**
 * Length in characters as Postgres counts them (code points), so an emoji
 * counts as one character rather than two UTF-16 units.
 */
export function characterLength(value: string): number {
  return [...value].length;
}

/** Returns an error message, or null if the (already trimmed) title is valid. */
export function titleError(title: string): string | null {
  if (title === "") return "Title is required";
  const length = characterLength(title);
  if (length > TITLE_MAX_LENGTH) {
    return `Title must be ${TITLE_MAX_LENGTH} characters or fewer (it has ${length})`;
  }
  return null;
}

/** Returns an error message, or null if the (already trimmed) notes are short enough. */
export function notesError(notes: string): string | null {
  const length = characterLength(notes);
  if (length > NOTES_MAX_LENGTH) {
    return `Notes must be ${NOTES_MAX_LENGTH.toLocaleString("en-US")} characters or fewer (they have ${length.toLocaleString("en-US")})`;
  }
  return null;
}

/** True for a real calendar date written exactly as YYYY-MM-DD. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC silently rolls 2026-02-30 over to March 2, so check it round-trips.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Accepts only the whole numbers 1 to 5 written as a single digit. */
export function parsePriority(value: string): number | null {
  return /^[1-5]$/.test(value) ? Number(value) : null;
}
