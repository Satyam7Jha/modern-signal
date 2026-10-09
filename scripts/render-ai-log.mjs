// Renders a Claude Code session transcript (JSONL) as a readable Markdown file.
// Every user message, assistant message, thinking block, tool call and tool
// result is kept in order and in full; only embedded images (base64) are
// replaced by a placeholder, because the repo must not contain binary data.
//
// Usage: node render-ai-log.mjs <session.jsonl> <out.md> [--remove-paste=1,2] [redactions.json]
// --remove-paste=N[,M]: replace the Nth block of text the user pasted (Claude
//   Code wraps pastes in <pasted_content> tags; counted from 1 in transcript
//   order) with a note saying it was removed. Used here for a pasted recruiter
//   email that contained personal data.
// redactions.json (optional): a list of exact strings to replace. A plain
//   string is replaced with "[redacted: personal data]"; an object
//   { "text": "...", "reason": "local dev secret" } with "[redacted: <reason>]".
//   Keep this file outside the repo: it contains the values it hides.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const removePastes = new Set(
  (args.find((arg) => arg.startsWith("--remove-paste="))?.split("=")[1] ?? "").split(",").filter(Boolean).map(Number),
);
const [input, output, redactionsPath] = args.filter((arg) => !arg.startsWith("--"));
if (!input || !output) {
  console.error("Usage: node render-ai-log.mjs <session.jsonl> <out.md> [--remove-paste=1,2] [redactions.json]");
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

const out = [];
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

const PASTED_TEXT = /<pasted_content id="([^"]+)">[\s\S]*?<\/pasted_content id="\1">/g;
let pasteNumber = 0;
let removedPastes = 0;

function pushUserText(text, timestamp, label) {
  text = text.replace(PASTED_TEXT, (paste) => {
    pasteNumber++;
    if (!removePastes.has(pasteNumber)) return paste;
    removedPastes++;
    return `[Pasted text #${pasteNumber} removed from this log: it contained personal data (salary, phone numbers, contact details).]`;
  });
  const { context, user } = splitContext(text);
  for (const item of context) {
    out.push(`<details><summary>⚙️ Context added by Claude Code</summary>\n\n${fence(item)}\n\n</details>\n`);
  }
  if (user) {
    userMessages++;
    out.push(`## 👤 ${label} · ${time(timestamp)}\n\n${user}\n`);
  }
}

for (const record of records) {
  if (record.type === "user" && record.message) {
    const { content } = record.message;
    const blocks = typeof content === "string" ? [{ type: "text", text: content }] : content;

    for (const block of blocks) {
      if (block.type === "tool_result") {
        const text = contentToText(block.content ?? "");
        out.push(
          `<details><summary>Result${block.is_error ? " (error)" : ""}</summary>\n\n${fence(text)}\n\n</details>\n`,
        );
      } else if (block.type === "image") {
        userMessages++;
        out.push(`## 👤 User · ${time(record.timestamp)}\n\n[image omitted: screenshot pasted by the user]\n`);
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
        out.push(`## 🤖 Claude · ${time(record.timestamp)}\n\n${block.text}\n`);
      } else if (block.type === "thinking" && block.thinking?.trim()) {
        out.push(`<details><summary>💭 Thinking</summary>\n\n${fence(block.thinking)}\n\n</details>\n`);
      } else if (block.type === "tool_use") {
        toolCalls++;
        const { description, ...rest } = block.input ?? {};
        const summary = `🔧 ${block.name}${description ? ` — ${description}` : ""}`;
        out.push(
          `<details><summary>${summary.replace(/</g, "&lt;")}</summary>\n\n${fence(JSON.stringify(rest, null, 2), "json")}\n\n</details>\n`,
        );
      }
    }
  }
}

const first = records.find((r) => r.timestamp)?.timestamp;
const last = [...records].reverse().find((r) => r.timestamp)?.timestamp;

const body = redact(out.join("\n"));
const header = [
  `# AI session transcript`,
  ``,
  `- Tool: Claude Code (VS Code extension), model Claude Opus`,
  `- Session: ${first ?? "?"} → ${last ?? "?"}`,
  `- ${userMessages} user messages, ${toolCalls} tool calls`,
  `- Rendered from the raw JSONL transcript; embedded images are replaced by placeholders${removedPastes ? `; ${removedPastes} pasted text block(s) containing personal data were removed and marked in place` : ""}${redactionCount ? `; ${redactionCount} occurrences of personal data or local dev secrets are marked [redacted: …]` : ""}. Nothing else is changed or removed.`,
  ``,
  `---`,
  ``,
].join("\n");

writeFileSync(output, header + body);
console.log(
  `wrote ${output}: ${userMessages} user messages, ${toolCalls} tool calls, ${removedPastes} pasted blocks removed, ${redactionCount} redactions`,
);
