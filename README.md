# Task List App

A task-list web app with CSV import. Each user signs in and sees only their own tasks, enforced in Postgres with row-level security (RLS).

**Demo video (3–5 min):** _link to be added_

**Stack:** TypeScript · Next.js 16 (App Router, Server Actions, Route Handler) · Supabase (Postgres 17 + Auth, run locally in Docker) · Tailwind CSS v4 · shadcn/ui (Radix) · three.js · papaparse · Vitest

## Features

- **Sign-in** with email and password (Supabase Auth). Every page except `/login` requires a session.
- **Tasks** with title, notes, due date, priority (1–5) and status (to do, in progress, done). You can create, edit, complete, reopen and **soft-delete** them; a delete can be undone from the toast.
- **Dashboard:** a greeting, stat tiles (open, due today, overdue, completed) and the list grouped into _Overdue · Today · Tomorrow · Next 7 days · Later · Completed_, with human due labels ("Tomorrow", "3 days ago"). Only the table scrolls; its header stays pinned.
- **Search and filters:** search covers title and notes; filters cover status, priority and due date (overdue, today, next 7 days). Saved views in the sidebar show live counts. Everything lives in the URL, so a filtered view survives a reload and can be shared.
- **CSV import:**
  - every row is validated on the server;
  - duplicates are caught within the file and against the account;
  - valid rows are inserted in one transaction;
  - each rejected row is listed with its row number and reason, and the list downloads as CSV.
- **States:** skeleton while loading, empty states (no tasks / no matches), an error boundary with retry, and a not-found page.
- **Keyboard:** <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> opens a command palette (search, views, actions, theme), <kbd>N</kbd> starts a new task and <kbd>/</kbd> focuses search.
- **Theme:** light, dark or system. The sign-in page shows a live three.js "task board" whose completed tiles glow.

## Running it

Prerequisites: **Node.js 20+** (developed on Node 24) and **Docker** (running). The Supabase CLI is an npm dev dependency, so nothing else needs installing globally.

```bash
npm install
npm run db:start              # starts Supabase in Docker and applies supabase/migrations
cp .env.example .env.local    # local Supabase URL + publishable key (fixed CLI defaults, not secrets)
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000, choose **Create account**, and sign up with any email and a password of 6+ characters. Email confirmation is off for local development.

The first `npm run db:start` downloads the Supabase Docker images, which takes a few minutes; later starts take seconds. If your publishable key differs from the one in `.env.example`, copy it from `npm run db:status`.

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests and database tests (see below) |
| `npm run db:status` | Local URLs and keys (Studio: http://127.0.0.1:54323) |
| `npm run db:reset` | Recreate the local database from the migrations (deletes all data) |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the schema |
| `npm run db:stop` | Stop the Supabase containers |
| `npm run lint` / `npm run build` | ESLint / production build |

## Running the tests

```bash
npm run db:start   # the RLS and import tests talk to the local database
npm test           # 78 tests
```

| File | What it covers |
| --- | --- |
| `tests/task-fields.test.ts` | Field rules: title length (counted the way Postgres counts characters), real `YYYY-MM-DD` dates, priority 1–5 |
| `tests/csv-import.test.ts` | CSV parsing (quoted commas, escaped quotes, CRLF, blank rows, BOM, multi-line values, unclosed quotes, unquoted commas), every validation message, duplicates within the file, account duplicates, the rejected-rows CSV, and the whole `samples/edge-cases.csv` |
| `tests/import-tasks.test.ts` | The `import_tasks` SQL function: skips rows already in the account (case-insensitive), ignores soft-deleted tasks, scopes duplicates to the caller's account, and rolls the whole batch back on failure |
| `tests/rls.test.ts` | Another user cannot read, edit, complete, soft-delete or take over a task, and cannot create one in someone else's name. Nobody can hard-delete. Signed-out visitors see nothing. |
| `tests/tasks.test.ts` | List helpers: filter parsing, LIKE escaping, relative due labels, grouping into sections |

The database tests sign up fresh users through Supabase Auth with only the publishable key, so they go through exactly the same RLS checks as the app. To check that the RLS tests aren't vacuous, I disabled RLS on the table and re-ran them. The four ownership tests failed, as they should. The other four still passed because column grants protect those cases independently.

## Trying the CSV import

Upload [`samples/edge-cases.csv`](samples/edge-cases.csv) on the **Import CSV** page. It is saved with Windows (CRLF) line endings and contains:

| Row | Content | Result |
| --- | --- | --- |
| 2 | `Buy groceries`, notes `"Milk, eggs, and bread"` (quoted commas) | Imported |
| 3 | `Call the dentist` | Imported |
| 4 | `buy groceries ` with the same due date as row 2 | Rejected: duplicate of row 2 in this file |
| 5 | _(empty row)_ | Rejected: row is empty |
| 6 | Priority `high` | Rejected: not a whole number from 1 to 5 |
| 7 | Title of 212 characters | Rejected: must be 200 characters or fewer |
| 8 | Due date `2026-02-30` | Rejected: not a valid YYYY-MM-DD date |
| 9 | Notes `"Agenda: ""kickoff"", workshops, dinner"` (escaped quotes) | Imported |

Upload the same file again: the three valid rows are now rejected as duplicates of tasks already in your account.

## How it works

### Security: row-level security does the access control

- The migration in `supabase/migrations/` enables RLS on `tasks`. Its `select`, `insert` and `update` policies all require `user_id = auth.uid()`.
- The app only ever uses the **publishable key plus the user's session cookie**, so every query runs as that user. No service-role key exists anywhere in the app or the tests.
- `user_id` defaults to `auth.uid()` and is left out of the column grants, so a client can neither set it on insert nor change it later.
- There is **no delete policy and no delete grant**: hard deletes are impossible, only soft deletes.
- The policies check ownership only; soft-deleted rows are filtered in the queries. If the `select` policy hid deleted rows, the `update` that sets `deleted_at` would itself be rejected, because Postgres requires an updated row to stay visible.
- `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the session cookie and redirects signed-out visitors to `/login`. That is a convenience. Every Server Action and the import route check the user again, and RLS is the real boundary.

### CSV import pipeline

1. **Upload:** the page posts the file to `POST /api/import` (`src/app/api/import/route.ts`). Files over 1 MB or 5,000 rows are refused.
2. **Parse and validate:** `src/lib/csv-import.ts` is pure functions with unit tests.
   - papaparse handles quoted commas, escaped quotes and a UTF-8 BOM; `\r\n` and `\r` are normalised first.
   - Headers match in any order and case. `notes` is optional.
   - Each row is checked with the same rules as the task form (`src/lib/task-fields.ts`), and **every** problem in a row is reported, not just the first.
   - Duplicates within the file are caught here: the first valid occurrence wins.
3. **Insert in one transaction:** the valid rows go to the `import_tasks` SQL function.
   - It runs as the calling user (`security invoker`), so RLS applies.
   - It takes a per-user advisory lock, so two simultaneous uploads can't both pass the duplicate check.
   - It skips rows that match an active task, inserts the rest in one statement, and returns the row numbers it inserted.
4. **Report:** rows that were sent but not inserted are marked as duplicates in the account. The page lists every rejected row and can download them as CSV. Values that Excel would run as formulas are escaped in that file.

### Decisions on rules the brief leaves open

| Question | Decision |
| --- | --- |
| Are `due_date` and `priority` required? | Yes, both in the form and in the CSV. A blank isn't a valid date or a whole number, and the duplicate rule needs a date. `notes` is optional. |
| Row numbers | Spreadsheet numbering: the header is row 1. A quoted value spanning several lines is still one row. |
| Empty rows | A blank row between data rows is reported as "Row is empty". Blank lines at the end of the file are ignored. |
| "Same title" | Equal after trimming surrounding spaces, ignoring case. |
| Deleted tasks and duplicates | A soft-deleted task does not count as a duplicate. |
| `3.0`, `03`, ` 3` as priority | Values are trimmed, so ` 3` is accepted. `3.0`, `03`, `2.5` and `high` are rejected. |
| Priority order | 1 is the most urgent. Lists sort by due date, then priority. |
| Unquoted comma (more values than columns) | The row is rejected with a hint to quote the value, rather than having its values silently shifted. |
| Unclosed quote | The row where it starts is rejected; rows before it still import. |

### Project structure

```
src/
  proxy.ts                         session refresh + redirect to /login
  lib/
    task-fields.ts                 field rules shared by the form and the CSV import
    csv-import.ts                  CSV parsing, validation, duplicates, rejected-rows CSV (pure)
    tasks.ts                       task type, filters, relative dates, grouping (pure)
    task-summary.ts                counts for the sidebar and stat tiles (React cache)
    views.ts                       saved views = sets of URL filters
    supabase/server.ts             Supabase client bound to the user's session cookie
  components/
    ui/                            shadcn/ui primitives (Table has a small containerClassName addition)
    task-board-scene.tsx           three.js scene on the sign-in page
    stat-card.tsx, task-badges.tsx, page-header.tsx, app-logo.tsx
  app/
    login/                         split-screen sign-in / sign-up
    (app)/                         signed-in area: sidebar, ⌘K menu, loading / error / not-found
      page.tsx                     dashboard + task list
      tasks/actions.ts             create / update / status / soft-delete / restore Server Actions
      tasks/new, tasks/[id]/edit   task form with live preview
      import/                      CSV import page
    api/import/route.ts            POST /api/import
supabase/migrations/               tasks table, RLS policies, import_tasks function
samples/edge-cases.csv             the edge-case demo file
tests/                             Vitest unit + database tests
ai-log/                            AI session transcripts
```

### Dependencies and security

- `npm audit --omit=dev` reports **0 vulnerabilities** in runtime dependencies.
- The "high" findings in a full audit all trace to `braces`, used through glob tooling in `eslint-config-next` and the `shadcn` CLI. Both are dev dependencies, and no user input reaches them.
- No secrets are committed. `.env.example` holds only the fixed defaults of the local Supabase CLI.

## What I would do next

- **CI:** a GitHub Actions workflow that runs `supabase start`, `npm test`, lint and build on every push. Add Playwright end-to-end tests for sign-up, CRUD and uploading `samples/edge-cases.csv`.
- **Time zones:** "today" is currently the server's date. Store each user's time zone so "Due today" and "Overdue" follow their clock.
- **Import UX:** a dry-run preview before committing, a choice between skipping duplicates and updating them, and background processing for large files.
- **Trash:** a view of soft-deleted tasks with restore, plus a scheduled job that purges old ones.
- **Scale:** pagination or list virtualisation instead of the 500-row limit, and trigram indexes if search gets slow.
- **Production:** a hosted Supabase project and Vercel deploy, email confirmation and password reset, and rate limiting on `/api/import`.
- **Accessibility:** an axe audit and full keyboard navigation inside the table.

## How I used AI

I built this with Claude Code (Claude Opus) in VS Code. The full, unedited transcript is in [`ai-log/`](ai-log/). The workflow was:

1. **Understand, then plan.** I had the brief restated and the open questions listed before any code. The decisions above came out of that.
2. **Small, verified steps.** Each step was tested before it was committed: unit tests first for the pure CSV logic, then the database tests, then the app checked in a real browser (sign-up, CRUD, filters, the edge-case upload, two users isolated from each other, the error state with the API stopped).
3. **Read the docs instead of trusting memory.** Next.js 16 ships its docs in `node_modules`. They showed that `middleware.ts` is now `proxy.ts`, that `error.tsx` receives `retry`, and that Cache Components is on by default, which I turned off on purpose.
4. **I reviewed the running app and steered.** Direction that came from me looking at the result:
   - switch the UI to shadcn/ui components only;
   - push the design much further;
   - remove the empty space in the header;
   - scroll only the table, not the whole page;
   - fix the squeezed "New task" page.
5. **The agent checked its own work.** First attempts that were wrong, and how they were caught (all visible in the log):
   - The sample CSV had an unquoted comma in the long title. A unit test caught it, and the fix went into the fixture, not the parser.
   - The first "disable RLS and re-run" check was vacuous: zsh doesn't split a command stored in a variable, so RLS was never disabled. Tests that passed when they shouldn't have gave it away. The redo showed the expected 4 failures.
   - Staged deletions twice leaked into the wrong commit. The commits were unpushed, so they were redone, and `git diff --cached --stat` is now checked before each commit.
   - shadcn assumptions failed in the browser: blank Select labels before hydration, and a crash because this version's `CommandDialog` doesn't include the cmdk root.
   - Layout bugs were found by measuring in the browser: the sidebar's `h-full` couldn't resolve inside a flex item, and an `mx-auto` flex child squeezed the form.
   - `supabase init` named the project after the folder, which contained a company name. It was renamed.
   - An unfamiliar `cn` npm package appeared. Its publisher and install scripts were checked before keeping it, and the `npm audit` findings were traced to their source.
