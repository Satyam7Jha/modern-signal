# Task List App

A small task-list web app with CSV import. Each user signs in and sees only their own tasks, enforced in Postgres with row-level security (RLS).

**Demo video (3–5 min):** _link to be added_

**Stack:** TypeScript · Next.js 16 (App Router, Server Actions, Route Handler) · Tailwind CSS v4 · Supabase (Postgres 17 + Auth, run locally in Docker) · papaparse · Vitest

## Features

- Email/password sign-up and sign-in (Supabase Auth); every page except `/login` requires a session.
- Tasks with title, notes, due date, priority (1–5) and status (`To do`, `In progress`, `Done`).
- Create, edit, complete/reopen and delete tasks. Delete is a **soft delete** (`deleted_at` is set; the row stays).
- Task list with **search** (title and notes) and **filters** (status, priority, overdue / due today / next 7 days). Filters live in the URL, so they survive a reload and can be bookmarked.
- **Loading** (skeleton), **empty** (no tasks / no matches) and **error** (with retry) states.
- **CSV import** with per-row validation, duplicate detection, a transactional insert, a report of every rejected row with its row number and reason, and a download of the rejected rows as CSV.

## Running it

Prerequisites: **Node.js 20+** (developed on Node 24) and **Docker** (running). The Supabase CLI is an npm dev dependency, so nothing else needs to be installed globally.

```bash
npm install
npm run db:start              # starts Supabase in Docker and applies supabase/migrations
cp .env.example .env.local    # local Supabase URL + publishable key (same defaults for everyone)
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000, choose **Create an account**, and sign up with any email and a 6+ character password (email confirmation is turned off for local development).

`npm run db:start` prints the local URLs when it finishes. If your publishable key differs from the one in `.env.example`, copy it from `npm run db:status` into `.env.local`.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run db:status` | Shows local URLs and keys (Studio is at http://127.0.0.1:54323) |
| `npm run db:reset` | Recreates the local database from the migrations (deletes all data) |
| `npm run db:stop` | Stops the Supabase containers |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Running the tests

```bash
npm run db:start   # the RLS and import tests run against the local database
npm test
```

| File | What it covers |
| --- | --- |
| `tests/task-fields.test.ts` | Field rules: title length (counted like Postgres), real `YYYY-MM-DD` dates, priority 1–5 |
| `tests/csv-import.test.ts` | CSV parsing (quoted commas, escaped quotes, CRLF, blank rows, BOM, multi-line values, unclosed quotes), validation messages, duplicates within the file, merging account duplicates, rejected-rows CSV, and the full `samples/edge-cases.csv` file |
| `tests/import-tasks.test.ts` | The `import_tasks` SQL function: skips rows already in the account (case-insensitive), ignores soft-deleted tasks, scopes duplicates to the caller's account, and rolls back the whole batch on failure |
| `tests/rls.test.ts` | One user cannot read, edit, complete, soft-delete or take over another user's task, cannot create a task in someone else's name, nobody can hard-delete, and signed-out visitors see nothing |

The database tests sign up fresh users through Supabase Auth with the publishable key, so they exercise the same RLS path as the app.

## Trying the CSV import

Upload [`samples/edge-cases.csv`](samples/edge-cases.csv) on the **Import CSV** page. It is saved with Windows (CRLF) line endings and contains:

| Row | Content | Result |
| --- | --- | --- |
| 2 | `Buy groceries` with notes `"Milk, eggs, and bread"` (quoted commas) | Imported |
| 3 | `Call the dentist` | Imported |
| 4 | `buy groceries ` with the same due date as row 2 | Rejected: duplicate of row 2 in this file |
| 5 | _(empty row)_ | Rejected: row is empty |
| 6 | Priority `high` | Rejected: priority is not a whole number from 1 to 5 |
| 7 | Title of 212 characters | Rejected: title must be 200 characters or fewer |
| 8 | Due date `2026-02-30` | Rejected: not a valid YYYY-MM-DD date |
| 9 | Notes `"Agenda: ""kickoff"", workshops, dinner"` (quoted commas and escaped quotes) | Imported |

Upload the same file a second time and the three valid rows are rejected as duplicates of tasks already in your account.

## How it works

### Security: row-level security does the access control

- `supabase/migrations/…_create_tasks.sql` enables RLS on `tasks` with `select`, `insert` and `update` policies that all require `user_id = auth.uid()`.
- The app only ever uses the **publishable key plus the user's session cookie**, so every query runs as that user and Postgres filters the rows. There is no service-role key anywhere in the app or tests.
- `user_id` defaults to `auth.uid()` and is not in the column grants, so a client can neither set it on insert nor change it on update.
- There is **no delete policy and no delete grant**: hard deletes are impossible, only soft deletes.
- The RLS policies check ownership only. Soft-deleted rows are filtered in queries (`deleted_at is null`). If the `select` policy hid deleted rows, the `update` that sets `deleted_at` would itself be rejected, because Postgres requires the updated row to stay visible.
- `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the session cookie and redirects signed-out users to `/login`. That is a convenience; every Server Action and the import route check the user again, and RLS is the real boundary.

### CSV import pipeline

1. **Upload** – `src/app/(app)/import/import-form.tsx` posts the file to `POST /api/import` (`src/app/api/import/route.ts`). Files over 1 MB or 5,000 rows are refused.
2. **Parse and validate** – `src/lib/csv-import.ts` (pure functions, unit tested):
   - papaparse handles quoted commas, escaped quotes and a UTF-8 BOM; `\r\n` and `\r` are normalised to `\n` first.
   - Headers are matched case-insensitively in any order; `title`, `due_date` and `priority` are required, `notes` is optional.
   - Each row is checked against the same rules the task form uses (`src/lib/task-fields.ts`), and **every** problem in the row is reported, not just the first.
   - Duplicates within the file are detected here: the first valid occurrence is kept, later ones are rejected with the row number of the original.
3. **Insert in one transaction** – the valid rows are sent to the `import_tasks` SQL function. It runs as the calling user (`security invoker`, so RLS applies), takes a per-user advisory lock so two simultaneous uploads cannot both pass the duplicate check, skips rows that match an active task in the account, inserts the rest in one statement and returns the row numbers it inserted.
4. **Report** – rows that were sent but not inserted are marked as duplicates in the account. The response lists every rejected row with its row number and reason; the page shows them in a table and can download them as CSV.

### Decisions on rules the brief leaves open

| Question | Decision |
| --- | --- |
| Are `due_date` and `priority` required? | Yes, in the form and the CSV. A blank value is not a valid date or a whole number, and the duplicate rule (title + due date) needs a date. `notes` is optional. |
| Row numbers | Spreadsheet numbering: the header is row 1, so the first data row is row 2. A quoted value spanning several lines is still one row. |
| Empty rows | A blank row between data rows is reported as "Row is empty". Blank lines at the end of the file (such as a final newline) are ignored. |
| What counts as "the same title"? | Equal after trimming surrounding spaces, ignoring case. |
| Do deleted tasks count as duplicates? | No. A soft-deleted task is gone from the user's point of view. |
| Is `3.0` or ` 3` a valid priority? | Values are trimmed, so ` 3` is fine. `3.0`, `03`, `2.5`, `high` are rejected: the priority must be one digit from 1 to 5. |
| Priority order | 1 is the highest priority; the list sorts by due date, then priority. |
| A row with an unquoted comma (more values than columns) | Rejected with a hint to quote the value, rather than silently shifting values into the wrong columns. |
| Unclosed quote | The row where it starts is rejected (it swallows the rest of the file); rows before it are still imported. |
| Spreadsheet safety | In the rejected-rows CSV, values starting with `=`, `+`, `-`, `@` or a tab are prefixed with `'` so Excel does not run them as formulas. |

### Project structure

```
src/
  proxy.ts                      session refresh + redirect to /login
  lib/
    task-fields.ts              field rules shared by the form and the CSV import
    csv-import.ts               CSV parsing, validation, duplicates, rejected-rows CSV (pure)
    tasks.ts                    task type, list filters, search escaping
    supabase/server.ts          Supabase client bound to the user's session cookie
  app/
    login/                      sign-in / sign-up page and Server Actions
    (app)/                      signed-in area (layout with header, loading/error/not-found)
      page.tsx                  task list with search and filters
      tasks/actions.ts          create / update / complete / soft-delete Server Actions
      tasks/new, tasks/[id]/edit
      import/                   CSV import page and client form
    api/import/route.ts         POST /api/import
supabase/
  config.toml                   local Supabase settings
  migrations/                   tasks table, RLS policies, import_tasks function
samples/edge-cases.csv          demo file for the import edge cases
tests/                          Vitest unit and database tests
ai-log/                         AI session transcripts
```

## What I would do next

_To be filled in at the end of the session._

## How I used AI

_To be filled in at the end of the session._ The full, unedited transcripts are in [`ai-log/`](ai-log/).
