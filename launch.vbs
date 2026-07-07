' launch.vbs - start the Discord bridge fully detached (hidden, no waiting parent).
' Window style 0 = hidden; False = don't wait -> the supervisor keeps running
' after this script and its launching console exit, immune to CTRL_CLOSE.
' Self-locates supervise.cmd next to this script so the package is path-portable.
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c """ & scriptDir & "\supervise.cmd""", 0, False
