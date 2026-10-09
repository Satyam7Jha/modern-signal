-- The form and the CSV import both limit notes to 5,000 characters
-- (NOTES_MAX_LENGTH in src/lib/task-fields.ts). Before this, nothing stopped a
-- longer value reaching the table: the CSV import had no limit at all, and a
-- 900 KB note imported fine. The database now enforces the same rule.
alter table public.tasks
  add constraint tasks_notes_length_check check (char_length(notes) <= 5000);
