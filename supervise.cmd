@echo off
rem supervise.cmd - keep the rich Discord bridge alive; restart 3s after any exit.
rem Engine = bun bot.ts (headless bridge): live named-tool status, embeds, choice
rem buttons, 50MB inbound attachments, permission relay, idle-watchdog long jobs.
rem Launched detached by launch.vbs so no console-close can kill it.
rem
rem Why not the official channel engine: Anthropic gates any non-approved channel
rem behind --dangerously-load-development-channels, which shows a startup confirm
rem dialog that hangs headless (no TTY). So a custom rich channel can't run as a
rem daemon; bot.ts (its own gateway via discord.js) is the headless-viable path.
rem %~dp0 = this script's own folder → path-portable; bun resolved from PATH.
cd /d "%~dp0"
if not exist logs mkdir logs
:loop
bun bot.ts
timeout /t 3 /nobreak >nul
goto loop
