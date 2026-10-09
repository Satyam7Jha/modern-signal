# AI log

The complete history of the AI sessions used to build this project: three Claude Code sessions in VS Code, all on 2026-10-09. Each session is split into parts so that GitHub can render them.

| Session | Part | Time (UTC) | What happened |
| --- | --- | --- | --- |
| **1. Building the app** | [Part 1](1-build/part-1.md) | 04:37–05:50 | Reading the brief, restating it and listing open questions, the plan and decisions, scaffold, CSV parsing and validation with unit tests written first |
| | [Part 2](1-build/part-2.md) | 05:50–06:11 | Schema and RLS, the RLS tests (and proving they fail with RLS off), auth, task list, import page, browser checks with two users, first README, and my request to switch to shadcn/ui |
| | [Part 3](1-build/part-3.md) | 06:11–06:29 | The shadcn/ui rebuild, then design iterations from my screenshots: sidebar shell, dashboard, three.js sign-in, empty space in the header, scrolling only the table |
| | [Part 4](1-build/part-4.md) | 06:29–06:41 | The broken "New task" page, final README, and the first version of this log and its renderer |
| **2. Independent review** | [Part 1](2-review/part-1.md) | 06:43–06:49 | A separate session I asked to judge the finished repo against the brief. It ran the checks, uploaded messy and large files through the real import API, and scored the project. It found the 1,000-row bug, the company name in the repo and log, and a leaked email fragment. |
| **3. Fixing the review's findings** | [Part 1](3-review-fixes/part-1.md) | 06:52– | Each bug reproduced before it was fixed: the 1,000-row import and count bug, the notes limit, literal search. Also a route test, a Playwright test, CI, a seed script, the redactions and this split log. |

## How the transcripts were produced

Claude Code stores each session as a JSONL file. [`scripts/render-ai-log.mjs`](../scripts/render-ai-log.mjs) turns it into Markdown:

- **Kept in full, in order:** every message I typed (including the ones sent while the agent was working), every assistant reply, the agent's visible thinking, every tool call with its input, and every tool result.
- **Shown as placeholders:** embedded images (my pasted screenshots and the agent's browser screenshots), because the repository must not contain binary data. The base64 image data makes up most of each raw file.
- **Labelled, not hidden:** context that Claude Code injects automatically (IDE notices, background-task notifications, tool instructions) sits in collapsed "Context added by Claude Code" blocks, and text I pasted is shown verbatim in "Pasted text" blocks. Neither can be mistaken for something I typed.
- **Split into parts:** GitHub doesn't render Markdown files of several hundred KB, and the first session alone is 770 KB. A new part starts at my first message after a part passes 200 KB, or at the next block if it passes 350 KB first. Blocks are never cut in half. Each part's header gives the whole session's message and tool-call counts.
- **Removed, and marked where it was:** my first message included a pasted recruiter email with personal data (salary, phone numbers, contact details). The brief asks for no personal data in the repository, so that pasted block is replaced by a note. My own instruction in the same message is kept.
- **Redacted, and marked:** some strings are replaced with `[redacted: <reason>]`:
  - `personal data`: the same personal details where they reappeared in tool output or in the agents' own checks, including fragments of an email address that the first version of this log missed;
  - `company name`: the hiring company's name. The project folder was named after it, so it appears in almost every file path;
  - `local dev secret`: the default secret keys printed by the local Supabase CLI. These are well-known local-only values, redacted so secret scanners don't flag them.

  The list of redacted strings is kept outside the repository, because it contains the values it hides.

Nothing else was edited, reordered or removed. Session 3's transcript was rendered near the end of that session, so it ends just before the last commit and push.

To view a part, open it on GitHub, or open the `.md` file in VS Code and press <kbd>⌘⇧V</kbd> for the Markdown preview.

To regenerate them:

```bash
P=~/.claude/projects/<project>
R=/path/outside/repo/redactions.json
node scripts/render-ai-log.mjs $P/af63c059-67ac-41df-b063-34736dd48537.jsonl ai-log/1-build --title="Session 1: building the app" --remove-paste=1 $R
node scripts/render-ai-log.mjs $P/eb6873f5-c12d-42ad-a0c1-28038c219f12.jsonl ai-log/2-review --title="Session 2: independent review" $R
node scripts/render-ai-log.mjs $P/c1e6d7cb-1c27-4851-bf95-92c0875a1bc3.jsonl ai-log/3-review-fixes --title="Session 3: fixing the review's findings" $R
```

## Reading tips

- **The plan and decisions:** the first assistant replies in session 1, part 1, before any code.
- **Next.js 16 changes:** the agent reads the bundled docs (`node_modules/next/dist/docs`) before writing pages (session 1, part 1).
- **Proving the RLS tests aren't vacuous:** search for "RLS DISABLED" in session 1, part 2.
- **Browser verification:** search for "Upload a CSV" and "Bob" in session 1, part 2.
- **Design iterations:** session 1, part 3: my messages about empty space, page-wide scrolling and the broken form, and the fixes that follow.
- **The review's score and findings:** the last message of session 2.
- **Reproducing the 1,000-row bug before fixing it:** search for "1,000-row" in session 3.
