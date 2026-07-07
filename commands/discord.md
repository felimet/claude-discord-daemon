---
description: Control the 24/7 Discord ⇄ Claude Code daemon (up / down / status / logs).
argument-hint: "[up|down|status|logs]"
---

# /discord - claude-discord-daemon control

Run the `claude-discord-daemon` CLI to manage the always-on Discord bridge.
The user's requested action is `$ARGUMENTS` (default to `status` if empty).

Map the action to a command and run it, preferring the globally-installed `cdd`
binary, falling back to `bunx` if `cdd` is not on PATH:

| Action | Command |
|---|---|
| `up` | `cdd up`  (or `bunx claude-discord-daemon up`) |
| `down` | `cdd down`  (or `bunx claude-discord-daemon down`) |
| `status` | `cdd status`  (or `bunx claude-discord-daemon status`) |
| `logs` | `cdd logs`  (or `bunx claude-discord-daemon logs`) |

What each does:

- **up** - registers the `ClaudeDiscordBridge` logon task (if missing) and starts
  the bridge detached (survives terminal close, crashes, and reboots).
- **down** - stops the supervisor and the engine process.
- **status** - shows the logon task state, supervisor/engine PIDs, and a log tail.
- **logs** - prints the last 40 lines of `bot.log`.

Prerequisites (state the first missing one instead of failing silently): Windows,
Bun on PATH, a logged-in Claude Code CLI, `DISCORD_BOT_TOKEN` in
`~/.claude/channels/discord/.env`, and your Discord user id in that folder's
`access.json` `allowFrom`. Run the command, then report its output verbatim.
