#!/usr/bin/env bun
// cli.ts — claude-discord-daemon: one-command 24/7 Discord bridge for Claude Code.
//
//   bunx claude-discord-daemon up        register logon task + start detached
//   bunx claude-discord-daemon status    task / processes / log tail
//   bunx claude-discord-daemon logs       last 40 log lines
//   bunx claude-discord-daemon down      stop supervisor + engine
//
// Engine = bot.ts, a headless Discord bridge (its own gateway via discord.js):
// each allowlisted DM spawns `claude -p` with full global config, and the reply
// streams back with a live named-tool status card (tool/skill/MCP/agent/command),
// embeds, choice buttons, 50MB inbound attachments, and Discord permission relay.
// The daemon shell (this CLI + launch.vbs + supervise.cmd + logon task) is what a
// bare `claude` session lacks: survives terminal close, crashes, and reboots.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = import.meta.dir
const TASK = 'ClaudeDiscordBridge'
const LOG_FILE = join(ROOT, 'bot.log')

function ps(script: string): { ok: boolean; out: string } {
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' })
    return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
  } catch (e) { return { ok: false, out: String(e) } }
}

function pids(pattern: string): string[] {
  const r = ps(`Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match '${pattern}' } | Select-Object -ExpandProperty ProcessId`)
  return r.ok ? r.out.split(/\s+/).filter(s => /^\d+$/.test(s)) : []
}
const supervisorPids = (): string[] => pids('supervise\\.cmd')
const enginePids = (): string[] => pids('bot\\.ts')

function taskRegistered(): boolean {
  return ps(`(Get-ScheduledTask -TaskName '${TASK}' -ErrorAction SilentlyContinue) -ne $null`).out.includes('True')
}

function registerTask(): void {
  const script = `
$ws='${ROOT.replace(/'/g, "''")}'
$vbs=Join-Path $ws 'launch.vbs'
$action=New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"'+$vbs+'"') -WorkingDirectory $ws
$trigger=New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\\$env:USERNAME"
$principal=New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -Hidden
Register-ScheduledTask -TaskName '${TASK}' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null`
  const r = ps(script)
  if (!r.ok) { console.error(`[cdd] task registration failed: ${r.out}`); process.exit(1) }
  console.log(`[cdd] registered logon task ${TASK}`)
}

function tailLog(n = 15): string {
  try { return readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean).slice(-n).join('\n') } catch { return '(no log yet)' }
}

function up(): void {
  if (!taskRegistered()) registerTask()
  if (supervisorPids().length > 0) { console.log('[cdd] already running'); status(); return }
  const r = spawnSync('wscript.exe', [join(ROOT, 'launch.vbs')], { encoding: 'utf8' })
  if (r.status !== 0) { console.error(`[cdd] launch failed: ${r.stderr}`); process.exit(1) }
  console.log('[cdd] daemon up (engine: rich bot.ts)')
}

function down(): void {
  const sup = supervisorPids()                              // stop the restarter first, then the engine
  const eng = enginePids()
  for (const pid of [...sup, ...eng]) ps(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`)
  console.log(`[cdd] stopped (supervisor: ${sup.length}, engine: ${eng.length})`)
}

function status(): void {
  console.log(`logon task : ${taskRegistered() ? 'registered' : 'NOT registered (run: up)'}`)
  console.log(`supervisor : ${supervisorPids().join(', ') || 'not running'}`)
  console.log(`engine     : ${enginePids().join(', ') || 'not running'}`)
  console.log(`log tail   : (${LOG_FILE})\n${tailLog(3)}`)
}

function logs(): void {
  console.log(tailLog(40))
}

const HELP = `claude-discord-daemon — 24/7 Discord bridge for Claude Code (Windows)

  up       register logon task + start detached
  status   task / processes / log tail
  logs     last 40 log lines
  down     stop supervisor + engine

engine: headless bridge (bot.ts) — live named-tool status, embeds, choice
        buttons, 50MB inbound, permission relay, idle-watchdog long jobs.`

if (process.platform !== 'win32') { console.error('[cdd] Windows only for now (launchd/systemd planned)'); process.exit(1) }
const [cmd] = process.argv.slice(2)
switch (cmd) {
  case 'up': up(); break
  case 'down': down(); break
  case 'status': status(); break
  case 'logs': logs(); break
  default: console.log(HELP)
}
