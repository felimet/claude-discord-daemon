# install-service.ps1 — register the Discord bridge as a per-user auto-start task.
#
# Runs `bun bot.ts` at logon under the current user (so `claude -p` inherits the
# user's ~/.claude auth). Survives closing terminals and reboot (re-launches at
# next logon). Auto-restarts on crash.
#
# NOTE on "survive logoff too": -AtLogOn re-launches when you log back in, which
# covers reboots. To keep running while fully logged off, re-register with
# -LogonType Password (you'll be prompted for your password once) instead of the
# Interactive principal below.
$ErrorActionPreference = 'Stop'

$ws  = $PSScriptRoot                       # repo root (portable); this script lives beside bot.ts/launch.vbs
$vbs = Join-Path $ws 'launch.vbs'
if (-not (Test-Path (Join-Path $ws 'bot.ts'))) { throw "bot.ts not found in $ws" }
if (-not (Test-Path $vbs)) { throw "launch.vbs not found in $ws" }

# Launch via wscript+VBS: the supervisor (supervise.cmd -> bun bot.ts) runs
# fully detached (hidden, no waiting parent), so console-close / logon-task
# teardown can't send it CTRL_CLOSE. supervise.cmd restarts bun on crash;
# bot.ts holds a loopback-port lock so a duplicate launch just exits.
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbs`"" -WorkingDirectory $ws
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew `
  -Hidden

Register-ScheduledTask -TaskName 'ClaudeDiscordBridge' `
  -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host 'Registered task ClaudeDiscordBridge (starts at logon, restarts on crash).'
Write-Host 'Start it now without waiting for logon:  Start-ScheduledTask -TaskName ClaudeDiscordBridge'
Write-Host 'Stop / remove:  Stop-ScheduledTask -TaskName ClaudeDiscordBridge ; Unregister-ScheduledTask -TaskName ClaudeDiscordBridge -Confirm:$false'
