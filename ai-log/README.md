# AI log

The complete history of the AI sessions used to build this project.

| File | Tool | What happened |
| --- | --- | --- |
| [`2026-10-09-claude-code-session.md`](2026-10-09-claude-code-session.md) | Claude Code (VS Code extension), model Claude Opus | The whole build, in one session: understanding the brief, plan and decisions, scaffold, schema and RLS, CSV import with tests, auth, task UI, browser verification, the shadcn/ui redesign, three.js sign-in, README and this log. |

## How the transcript was produced

Claude Code stores each session as a JSONL file. [`scripts/render-ai-log.mjs`](../scripts/render-ai-log.mjs) turns it into Markdown:

- **Kept in full, in order:** every message I typed (including the ones sent while the agent was working), every assistant reply, the agent's visible thinking, every tool call with its input, and every tool result.
- **Shown as placeholders:** embedded images (my pasted screenshots and the agent's browser screenshots), because the repository must not contain binary data. The base64 image data makes up most of the 15 MB raw file.
- **Labelled, not hidden:** context that Claude Code injects automatically (IDE "opened file" notices, background-task notifications, tool instructions) sits in collapsed "Context added by Claude Code" blocks, so it isn't mistaken for something I typed.
- **Removed, and marked where it was:** my first message included a pasted recruiter email with personal data (salary, phone numbers, contact details). The brief asks for no personal data in the repository, so that pasted block is replaced by a note. My own instruction in the same message is kept.
- **Redacted, and marked:** a few strings are replaced with `[redacted: personal data]` or `[redacted: local dev secret]`:
  - the same personal details where they reappeared in tool output or in the agent's own checks;
  - the default secret keys printed by the local Supabase CLI. These are well-known local-only values, redacted so secret scanners don't flag them.

  The list of redacted strings is kept outside the repository, because it contains the values it hides.

Nothing else was edited, reordered or removed.

To view it, open the `.md` file in VS Code and press <kbd>⌘⇧V</kbd> for the Markdown preview, or open it on GitHub.

To regenerate it:

```bash
node scripts/render-ai-log.mjs ~/.claude/projects/<project>/<session-id>.jsonl \
  ai-log/2026-10-09-claude-code-session.md --remove-paste=1 /path/outside/repo/redactions.json
```

## Reading tips

The transcript is long. Some useful places to jump to:

- **The plan and decisions:** the first assistant replies, before any code.
- **Next.js 16 changes:** the agent reads the bundled docs (`node_modules/next/dist/docs`) before writing pages.
- **Proving the RLS tests aren't vacuous:** search for "RLS DISABLED".
- **Browser verification:** search for "Upload a CSV" and "Bob".
- **Design iterations:** my messages about empty space, page-wide scrolling and the broken form, and the fixes that follow.
