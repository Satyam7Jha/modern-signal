// Renders a Claude Code session transcript (JSONL) as readable Markdown files.
// Every user message, assistant message, thinking block, tool call and tool
// result is kept in order and in full; only embedded images (base64) are
// replaced by a placeholder, because the repo must not contain binary data.
//
// GitHub only renders Markdown files up to a few hundred KB, so the session is
// split into parts (part-1.md, part-2.md, …) in <out-dir>. A new part starts at
// the first user message after a part passes PART_TARGET_BYTES, or at the
// next block if it passes PART_MAX_BYTES first. Blocks are never cut in half.
//
// Usage: node render-ai-log.mjs <session.jsonl> <out-dir> --title="…" [--remove-paste=1,2] [redactions.json]
// --title: the session's name, shown in each part's heading.
// --remove-paste=N[,M]: replace the Nth block of text the user pasted (Claude
//   Code wraps pastes in <pasted_content> tags; counted from 1 in transcript
//   order) with a note saying it was removed. Used here for a pasted recruiter
//   email that contained personal data.
// redactions.json (optional): a list of exact strings to replace, applied in
//   order. A plain string is replaced with "[redacted: personal data]"; an
//   object { "text": "...", "reason": "company name" } with "[redacted: <reason>]".
//   Keep this file outside the repo: it contains the values it hides.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PART_TARGET_BYTES = 200_000;
const PART_MAX_BYTES = 350_000;

const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const removePastes = new Set((option("remove-paste") ?? "").split(",").filter(Boolean).map(Number));
const title = option("title");
const [input, outDir, redactionsPath] = args.filter((arg) => !arg.startsWith("--"));
if (!input || !outDir || !title) {
  console.error(
    'Usage: node render-ai-log.mjs <session.jsonl> <out-dir> --title="…" [--remove-paste=1,2] [redactions.json]',
  );
  process.exit(1);
}

const redactions = redactionsPath ? JSON.parse(readFileSync(redactionsPath, "utf8")) : [];
let redactionCount = 0;
const redact = (text) => {
  for (const entry of redactions) {
    const { text: needle, reason } = typeof entry === "string" ? { text: entry, reason: "personal data" } : entry;
    const parts = text.split(needle);
    redactionCount += parts.length - 1;
    text = parts.join(`[redacted: ${reason}]`);
  }
  return text;
};

const records = readFileSync(input, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

const fence = (text, lang = "") => {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${lang}\n${text}\n${ticks}`;
};

const time = (iso) => (iso ? new Date(iso).toISOString().slice(11, 19) + " UTC" : "");

function contentToText(content) {
  if (typeof content === "string") return content;
  return content
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "image") return "[image omitted: screenshot]";
      return `[${block.type}]`;
    })
    .join("\n");
}

// Each rendered block, in transcript order. `userTurn` marks the start of a
// message the user typed, where a new part reads best.
const out = [];
const push = (text, timestamp, userTurn = false) => out.push({ text, timestamp, userTurn });
let userMessages = 0;
let toolCalls = 0;

// Claude Code injects context into user turns (IDE notices, background task
// notifications, tool instructions, loaded skills). Keep it, but label it as
// context rather than something the user typed.
const CONTEXT_TAG =
  /^\s*<(ide_opened_file|ide_selection|task-notification|browser_instruction|system-reminder)>[\s\S]*?<\/\1>/;
const CONTEXT_PREFIXES = ["Base directory for this skill", "[Image: source:"];

function splitContext(text) {
  const context = [];
  let rest = text;
  for (let match = rest.match(CONTEXT_TAG); match; match = rest.match(CONTEXT_TAG)) {
    context.push(match[0].trim());
    rest = rest.slice(match[0].length);
  }
  rest = rest.trim();
  if (CONTEXT_PREFIXES.some((prefix) => rest.startsWith(prefix))) {
    context.push(rest);
    rest = "";
  }
  return { context, user: rest };
}

// Text the user pasted is shown verbatim in a labelled code block, so it
// can't be mistaken for something they typed and its Markdown isn't rendered.
const PASTED_TEXT = /<pasted_content id="([^"]+)">\n?([\s\S]*?)\n?<\/pasted_content id="\1">/g;
let pasteNumber = 0;
let removedPastes = 0;

function pushUserText(text, timestamp, label) {
  text = text.replace(PASTED_TEXT, (_paste, _id, pasted) => {
    pasteNumber++;
    if (!removePastes.has(pasteNumber)) return `\n**📋 Pasted text #${pasteNumber}:**\n\n${fence(pasted)}\n`;
    removedPastes++;
    return `[Pasted text #${pasteNumber} removed from this log: it contained personal data (salary, phone numbers, contact details).]`;
  });
  const { context, user } = splitContext(text);
  for (const item of context) {
    push(`<details><summary>⚙️ Context added by Claude Code</summary>\n\n${fence(item)}\n\n</details>\n`, timestamp);
  }
  if (user) {
    userMessages++;
    push(`## 👤 ${label} · ${time(timestamp)}\n\n${user}\n`, timestamp, true);
  }
}

for (const record of records) {
  if (record.type === "user" && record.message) {
    const { content } = record.message;
    const blocks = typeof content === "string" ? [{ type: "text", text: content }] : content;

    for (const block of blocks) {
      if (block.type === "tool_result") {
        const text = contentToText(block.content ?? "");
        push(
          `<details><summary>Result${block.is_error ? " (error)" : ""}</summary>\n\n${fence(text)}\n\n</details>\n`,
          record.timestamp,
        );
      } else if (block.type === "image") {
        userMessages++;
        push(
          `## 👤 User · ${time(record.timestamp)}\n\n[image omitted: screenshot pasted by the user]\n`,
          record.timestamp,
          true,
        );
      } else if (block.type === "text") {
        pushUserText(block.text, record.timestamp, "User");
      }
    }
  } else if (record.type === "attachment" && record.attachment?.type === "queued_command") {
    // Messages the user sent while the agent was working.
    const text = contentToText(record.attachment.prompt ?? "").replace(
      "[image omitted: screenshot]",
      "[image omitted: screenshot pasted by the user]",
    );
    pushUserText(text, record.attachment.timestamp ?? record.timestamp, "User (sent while the agent was working)");
  } else if (record.type === "assistant" && record.message) {
    for (const block of record.message.content) {
      if (block.type === "text" && block.text.trim()) {
        push(`## 🤖 Claude · ${time(record.timestamp)}\n\n${block.text}\n`, record.timestamp);
      } else if (block.type === "thinking" && block.thinking?.trim()) {
        push(`<details><summary>💭 Thinking</summary>\n\n${fence(block.thinking)}\n\n</details>\n`, record.timestamp);
      } else if (block.type === "tool_use") {
        toolCalls++;
        const { description, ...rest } = block.input ?? {};
        const summary = `🔧 ${block.name}${description ? ` — ${description}` : ""}`;
        push(
          `<details><summary>${summary.replace(/</g, "&lt;")}</summary>\n\n${fence(JSON.stringify(rest, null, 2), "json")}\n\n</details>\n`,
          record.timestamp,
        );
      }
    }
  }
}

// Redact each block, then group the blocks into parts.
const parts = [[]];
let partBytes = 0;
for (const entry of out) {
  entry.text = redact(entry.text);
  const bytes = Buffer.byteLength(entry.text) + 1;
  const current = parts[parts.length - 1];
  const startNew =
    current.length > 0 && ((entry.userTurn && partBytes >= PART_TARGET_BYTES) || partBytes + bytes > PART_MAX_BYTES);
  if (startNew) {
    parts.push([]);
    partBytes = 0;
  }
  parts[parts.length - 1].push(entry);
  partBytes += bytes;
}

const timestamps = records.map((r) => r.timestamp).filter(Boolean);
const first = timestamps[0];
const last = timestamps[timestamps.length - 1];
const models = [...new Set(records.map((r) => r.type === "assistant" && r.message?.model).filter(Boolean))];
const tool =
  records.find((r) => r.entrypoint)?.entrypoint === "claude-vscode" ? "Claude Code (VS Code extension)" : "Claude Code";

const notes = [
  "embedded images are replaced by placeholders",
  removedPastes && `${removedPastes} pasted text block(s) containing personal data were removed and marked in place`,
  redactionCount &&
    `${redactionCount} occurrences of personal data, a company name or local dev secrets are marked [redacted: …]`,
].filter(Boolean);

const nav = (index) =>
  [
    index > 0 ? `[← Part ${index}](part-${index}.md)` : null,
    "[AI log index](../README.md)",
    index < parts.length - 1 ? `[Part ${index + 2} →](part-${index + 2}.md)` : null,
  ]
    .filter(Boolean)
    .join(" · ");

mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) {
  if (/^part-\d+\.md$/.test(file)) rmSync(join(outDir, file));
}

parts.forEach((entries, index) => {
  const partFirst = entries.find((e) => e.timestamp)?.timestamp;
  const partLast = [...entries].reverse().find((e) => e.timestamp)?.timestamp;
  const header = [
    `# ${title} · part ${index + 1} of ${parts.length}`,
    ``,
    `- Tool: ${tool}, model ${models.join(", ") || "unknown"}`,
    `- Session: ${first ?? "?"} → ${last ?? "?"} (this part: ${time(partFirst)} → ${time(partLast)})`,
    `- Whole session: ${userMessages} user messages, ${toolCalls} tool calls`,
    `- Rendered from the raw JSONL transcript; ${notes.join("; ")}. Nothing else is changed or removed.`,
    ``,
    nav(index),
    ``,
    `---`,
    ``,
  ].join("\n");
  const body = entries.map((entry) => entry.text).join("\n");
  writeFileSync(join(outDir, `part-${index + 1}.md`), `${header}${body}\n---\n\n${nav(index)}\n`);
});

console.log(
  `wrote ${parts.length} part(s) to ${outDir}: ${userMessages} user messages, ${toolCalls} tool calls, ` +
    `${removedPastes} pasted blocks removed, ${redactionCount} redactions`,
);
