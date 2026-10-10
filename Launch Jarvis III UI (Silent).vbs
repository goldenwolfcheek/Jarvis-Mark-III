' Jarvis Mark III (Revised) - Silent Launcher
' Double-click to launch without a console window staying open.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Run the production bat hidden (0 = hidden window, False = don't wait)
WshShell.Run """" & scriptDir & "\Run Jarvis III UI.bat""", 0, False

Set WshShell = Nothing
Set fso = Nothing
