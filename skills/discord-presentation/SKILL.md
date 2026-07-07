---
name: discord-presentation
description: Formatting and rich-output guide for replies relayed to Discord DM by the claude-discord-daemon bridge. Use for EVERY reply in this workspace — covers the Discord markdown subset (no tables!), embed cards, file attachments, choice buttons, and message limits.
---

# Discord presentation guide (for bridge replies)

Your plain-text output IS the reply that gets posted to Discord. The bridge handles: 2000-character chunking (paragraph-aware), auto-converting replies over 4000 characters into "head text + full-text .md attachment", the status card, and the ⏳/✅/❌ reactions. You do not need to truncate or report progress yourself.

## Discord markdown support

Available: `**bold**`, `*italic*`, `__underline__`, `~~strikethrough~~`, `` `inline code` ``, ` ```lang code block``` `, `> quote`, `# ## ###` headings, `- / 1.` lists, `||spoiler||`.

**Markdown tables are NOT supported** (`| a | b |` renders literally as ugly text). For tabular content use instead:

1. An embed's `fields` (one field per column, `inline: true` for three side-by-side columns) — preferred.
2. An aligned code block (monospace font) — for data-dense content.

Masked links `[text](url)` work only inside embeds; in a normal message just paste a bare URL and it auto-links.

## Rich directive protocol (each directive on its own line)

### Embed card: `[[embed: {single-line JSON}]]`

```
[[embed: {"title":"標題","description":"內文支援 markdown 與 \n 換行","color":5793266,"fields":[{"name":"欄名","value":"值","inline":true}],"footer":"註腳"}]]
```

Fields: `title` (≤256), `description` (≤4096, may contain a masked link), `color` (a number or `"#5865F2"`), `fields` (≤25, name ≤256 / value ≤1024, each may be `inline`), `footer` (≤2048), `url`, `image`, `thumbnail`. Up to 10 cards per message. The JSON must be single-line — use `\n` for line breaks; if the JSON is invalid, that line is preserved verbatim as text (handy for debugging).

Color conventions: info blue `5793266` (0x5865F2), success green `5763719` (0x57F287), warning yellow `16705372` (0xFEE75C), error red `15548997` (0xED4245).

When to use (use it where it fits, don't force it): structured summaries, status overviews, comparisons (in place of a table), lists with links, report cards. Plain conversational or code-heavy replies are fine as normal text.

### File attachment: `[[file: /absolute/path]]`

Use this directive to attach charts, reports, code files, and other artifacts you produce (≤25MB, ≤10 files; the bridge verifies existence and size, skipping missing / oversized files). You don't need to write a file yourself for a long text report — the bridge's 4000-character mechanism handles that.

### Choice buttons: `[[buttons: option one | option two]]` (last line of the reply)

Use when the user needs to make a choice, in place of a numbered menu. 2–5 options, each ≤80 characters. The clicked option's text becomes the user's next message back into the same session. The user may also ignore the buttons and just type. The first option renders as a blue primary button.

## Permissions

Tool permission prompts are turned into Discord Allow/Deny buttons by the bridge automatically, and the owner decides with a click. **Never** tell the user to approve things back in a terminal.

## Style

Keep replies concise, with no preamble or sign-off; leave attachments and long output to the bridge's mechanisms; don't report status/progress yourself (the bridge's named-tool status card shows it, and on success is overwritten in place into your final reply).
