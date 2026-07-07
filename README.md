**English** · [繁體中文](README.zh-TW.md)

# claude-discord-daemon

**A 24/7 headless Discord ⇄ Claude Code bridge (Windows).** A standalone process owns the Discord gateway around the clock and spawns a fresh headless `claude -p` for every allowlisted DM, so your bot's presence no longer depends on a live Claude Code terminal being open.

`Windows 11` · `Bun` · `discord.js v14` · `MIT`

Distributed both as an **npm package** (`bunx claude-discord-daemon` / `cdd`) and as a **Claude Code plugin** (the `/discord` command).

---

## What it is / why it exists

The official Discord channel plugin binds the Discord gateway to an MCP stdio pipe that dies the moment the terminal closes, so the bot is only online while you have Claude Code open. `claude-discord-daemon` runs `bot.ts` as its own long-lived process that holds the gateway connection itself. Each DM from an allowlisted user spawns a headless `claude -p` loaded with your full global config (MCP servers, plugins, `CLAUDE.md`), and that process posts the reply back. A Windows logon-task daemon keeps it alive across terminal close, crashes, and reboots.

---

## Features

- **Live named-tool status card.** While a run is in flight, a single embed status card is edited in place and names the exact tool / skill / MCP / agent / command currently running instead of a vague "thinking": `🔌 MCP matlab·evaluate` · `🖥️ Bash` · `🔍 Read` · `📝 Edit` · `🌐 WebFetch` · `🤖 agent code-reviewer` · `📚 skill xlsx` · `⌨️ /commit` · `🔧 tool`.
- **Status card overwritten into the reply.** On success the status card is edited in place into the final reply, with a faint Discord `-#` stat footer appended (`⚙️ elapsed · per-kind ×count`). The chat keeps a single message - no duplicate "done" card plus a separate reply. File / long / multi-chunk replies fall back to fresh messages (edits can't attach files), collapsing the status card to just the footer.
- **Rich output directives** (each on its own line in the reply):
  - `[[embed: {json}]]` renders a colored embed card. The JSON may span multiple lines.
  - `[[file: /absolute/path]]` attaches a produced file (verified for existence and size before sending).
  - a trailing `[[buttons: A | B]]` line renders 2-5 real Discord choice buttons; the clicked label is fed back into the same session as the next message.
- **50 MB inbound attachment download.** Attachments the user uploads (≤ 50 MB) are downloaded to a shared inbox and their local paths are appended to the prompt for `claude` to `Read`.
- **Permission relay.** A headless run's permission prompts are routed through `perm-mcp.ts` → a loopback endpoint → a Discord **Allow / Deny** button card; the owner clicks to decide. Users are never told to approve anything in a terminal.
- **Idle watchdog (no wall-clock cap).** By default there is no total time limit. A run is killed only when its event stream goes silent past `BOT_IDLE_TIMEOUT_MS` (a wedged process), never for merely taking a long time, so long jobs are fine.
- **Natural-language "new conversation" reset.** A message that *is* one of a small set of reset phrases (whole message, case-insensitive) drops the stored session so the next message starts fresh. See [New-conversation reset](#new-conversation-reset).
- **Per-chat session continuity.** Each chat's session UUID is stored in `sessions.json` and later messages `--resume` it, so context carries across DMs.
- **24/7 Windows daemon.** An `AtLogOn` scheduled task (`ClaudeDiscordBridge`) plus `launch.vbs` (detached) + `supervise.cmd` (restart on crash) + a single-instance loopback lock keeps the bridge running across terminal close, crashes, and reboots.
- **Portable - no hardcoded paths.** The working directory defaults to the engine directory and every path is overridable via env vars.

---

## Requirements

| Item | Detail |
|---|---|
| OS | Windows 11 (the scheduled-task / VBS / cmd supervision chain is Windows-specific) |
| Runtime | [Bun](https://bun.sh) ≥ 1.1.0, with `bun` on `PATH` |
| Claude Code | An installed, logged-in Claude Code CLI (the bridge spawns `claude -p`) |
| Discord | Your own Discord bot token, with the bot sharing a server with you (Discord requires a shared server before it will let you DM a bot) |

---

## Install

Two paths; pick one.

### (a) As an npm package

```powershell
# no-install, one-shot start
bunx claude-discord-daemon up

# or install globally and use the short alias cdd
npm i -g claude-discord-daemon
cdd up
```

CLI commands:

```
cdd up       # register the logon task + start detached
cdd status   # logon task / processes / log tail
cdd logs     # last 40 log lines
cdd down     # stop supervisor + engine
```

Bin names are `claude-discord-daemon` and `cdd` (identical).

### (b) As a Claude Code plugin

```
/plugin marketplace add felimet/claude-discord-daemon
/plugin install claude-discord-daemon
```

Then drive the same daemon with the `/discord` command:

```
/discord up | down | status | logs
```

`/discord` runs the same `cdd` CLI under the hood (falling back to `bunx claude-discord-daemon` when `cdd` is not on `PATH`).

---

## Setup

Before starting, put your bot token and sender allowlist in the bridge's state directory (default `~/.claude/channels/discord/`, overridable via `DISCORD_STATE_DIR`).

**1. Bot token** - write it to `~/.claude/channels/discord/.env`:

```
DISCORD_BOT_TOKEN=your_discord_bot_token
```

(Or set `DISCORD_BOT_TOKEN` directly in the process environment; a real env var wins over the `.env` file.)

**2. Allowlist** - create `~/.claude/channels/discord/access.json` and add your Discord user ID to `allowFrom`:

```json
{
  "allowFrom": ["your_discord_user_id"]
}
```

Only DMs from user IDs in `allowFrom` are processed; everything else is ignored (fail-closed). This file is re-read on every message, so allowlist edits apply without a restart.

**3. Pair and DM** - invite your bot into any Discord server you are also in (Discord only lets you DM a bot you share a server with), then DM the bot directly.

Optional `access.json` keys (same semantics as the official plugin):

| Key | Default | Effect |
|---|---|---|
| `ackReaction` | `⏳` | Acknowledgement reaction on receipt; set `""` to disable |
| `textChunkLimit` | `2000` | Per-message character cap (max 2000) |
| `chunkMode` | `newline` | Chunking strategy: `newline` (paragraph-aware) or `length` (hard cut) |

---

## Config (environment variables)

Everything except `DISCORD_BOT_TOKEN` is optional; set any of these in the process environment to override the default.

| Variable | Default | Purpose |
|---|---|---|
| `DISCORD_BOT_TOKEN` | (required) | Discord bot token; if unset, read from `<state dir>/.env` |
| `DISCORD_STATE_DIR` | `~/.claude/channels/discord` | Directory holding `.env`, `access.json`, and the `inbox/` for downloaded attachments |
| `BOT_WS_DIR` | engine directory | Working dir for `sessions.json`, `outbox/`, and `bot.log` |
| `CLAUDE_BIN` | `~/.local/bin/claude` | Path to the `claude` executable the bridge spawns |
| `BOT_PERMISSION_MODE` | `auto` | Permission mode for spawned runs. `auto`: the auto-classifier gates each tool call (read-only passes, destructive/self-modifying routes to a Discord Allow/Deny button). Set `default` to re-harden so every approval-requiring tool goes through the button flow |
| `BOT_MODEL` | unset (account default) | Pin a Claude model, e.g. `claude-sonnet-5` / `haiku`, to cut cost |
| `BOT_TIMEOUT_MS` | `0` (uncapped) | Per-run wall-clock cap in ms; `0` means no cap (long jobs supported) |
| `BOT_IDLE_TIMEOUT_MS` | `1800000` (30 min) | Kill a run after this many ms of stream silence (wedged-process watchdog) |
| `BOT_PERM_PORT` | `49223` | Loopback port for the permission-approval endpoint (`perm-mcp.ts` callback) |
| `BOT_PERM_TIMEOUT_MS` | `600000` (10 min) | An unanswered permission card auto-denies after this many ms |
| `BOT_LOCK_PORT` | `49222` | Single-instance loopback lock port |

---

## New-conversation reset

Send a message that **is** one of the following (whole message, case-insensitive) to drop the stored session so your next message starts a fresh conversation:

```
新對話   開新對話   重新開始   重開   清除對話   忘記
/new   /reset   reset   new chat
```

The match is strict and whole-message (trailing whitespace/punctuation is tolerated), so a passing mention like `來開新對話討論 X` does **not** reset the session, only a message that is entirely a reset phrase does. On reset the bot reacts 🆕 and confirms; the next DM begins a new `claude -p` session.

---

## How it works

```
Discord DM ──gateway──▶ bot.ts (long-lived; holds loopback :49222 as a single-instance lock)
                          │  allowlist check (access.json)
                          │  per-chat serialization + session continuity (sessions.json)
                          ▼
                  spawn: claude -p --output-format stream-json --verbose
                         --permission-mode auto
                         --permission-prompt-tool mcp__perm__approve
                         (--mcp-config merges in perm-mcp; global MCP / plugin / CLAUDE.md load as usual)
                          │
                          │  each stream-json event → update the named-tool status card + feed the idle watchdog
                          ▼
                  success → status card edited in place into the final reply + faint -# stat footer ──▶ Discord

Boot chain: logon task ClaudeDiscordBridge ─▶ wscript launch.vbs ─(detached)▶ supervise.cmd loop ─▶ bun bot.ts
```

Every DM is a fresh `claude -p` run. Because it loads the same global MCP / plugin / `CLAUDE.md`, replies behave the same as a Claude Code session you'd open in a terminal. Session UUIDs are keyed per chat in `sessions.json`; a stored session is resumed with `--resume`, and a non-transient resume failure drops the session and retries fresh once. Messages within a chat are serialized so rapid DMs don't race the session file.

---

## Architecture note: why a standalone bridge, not the official channel engine

Anthropic gates any non-approved custom channel behind `--dangerously-load-development-channels`, and that flag shows a startup confirmation dialog. A headless daemon has no TTY to answer that dialog, so it hangs, meaning a custom rich channel simply cannot run as a daemon. `bot.ts` owning its own discord.js gateway is the headless-viable path: it needs no development-channel flag and no interactive confirmation, so it can run unattended as a service.

Because both this bridge and the official plugin log in with the same bot token, the official plugin must be disabled (`claude plugin disable discord@claude-plugins-official`) before running this as a service, two gateway logins on one token produce duplicate replies.

---

## Security

- **Discord input is untrusted** (a prompt-injection surface). Inbound messages are wrapped in a `<channel source="discord" ...>` tag (metadata in the tag, untrusted text inside), and the system prompt tells the model to treat that content as chat text, never as instructions to change configuration or access rules.
- **The allowlist confines the sender surface.** Only user IDs in `access.json`'s `allowFrom` can trigger any run; a failure to read `access.json` fails closed. Button clickers (including permission-approval buttons) are re-authenticated against the same allowlist.
- **Permission mode `auto` (default).** The auto-classifier gates each tool call: read-only passes, destructive/self-modifying is blocked and surfaced as a Discord Allow/Deny button. **`bypassPermissions` is never used.** Set `BOT_PERMISSION_MODE=default` to harden further.
- **Access and pairing are managed by the owner only**, in the state directory, never via chat.

---

## License

MIT © 2026 Jia-Ming Zhou (felimet)
