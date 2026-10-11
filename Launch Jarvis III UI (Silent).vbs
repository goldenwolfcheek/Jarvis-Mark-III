' Jarvis Mark III — Silent Launcher (based on the working Mark II boot launcher)
' Uses shell.Run directly against cmd /c — no bat delegation, no start quirks.
' Logs to %TEMP%\jarvis3-boot.log for troubleshooting.

Option Explicit

Dim shell, fs, currentDir, electronDir, logFile, logStream, nodeCheck, buildExit

Set shell = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")

currentDir = fs.GetParentFolderName(WScript.ScriptFullName)
electronDir = currentDir & "\apps\desktop"
logFile = shell.ExpandEnvironmentStrings("%TEMP%") & "\jarvis3-boot.log"

Set logStream = fs.CreateTextFile(logFile, True)

Sub Log(msg)
    logStream.WriteLine Now() & " [JARVIS3] " & msg
End Sub

Log "=== Jarvis Mark III Boot Launcher ==="
Log "Script: " & WScript.ScriptFullName
Log "Project root: " & currentDir
Log "Electron dir: " & electronDir

If Not fs.FolderExists(electronDir) Then
    Log "FATAL: apps\desktop directory not found: " & electronDir
    Log "=== Aborted ==="
    logStream.Close
    WScript.Quit 1
End If

If Not fs.FileExists(electronDir & "\package.json") Then
    Log "FATAL: package.json not found in: " & electronDir
    Log "=== Aborted ==="
    logStream.Close
    WScript.Quit 1
End If

' Check if node is available (npx needs it)
nodeCheck = shell.Run("cmd /c where node >nul 2>&1", 0, True)
If nodeCheck <> 0 Then
    Log "WARNING: node.exe not found in PATH. Electron may fail."
End If

shell.CurrentDirectory = electronDir
Log "Working directory: " & electronDir

' Install dependencies if first run
If Not fs.FolderExists(electronDir & "\node_modules") Then
    Log "First run - running npm install..."
    shell.Run "cmd /c npm install", 0, True
    Log "npm install finished"
Else
    Log "Dependencies present, skipping install"
End If

' Always rebuild frontend so code changes are picked up
Log "Running vite build..."
Log "Command: cmd /c npx vite build"
buildExit = shell.Run("cmd /c npx vite build >nul 2>&1", 0, True)
If buildExit <> 0 Then
    Log "WARNING: vite build exit code = " & buildExit & " — continuing anyway (using last good build)"
Else
    Log "vite build completed successfully"
End If

' Strip crossorigin from inline module script tags (file:// CORS freeze fix)
Log "Patching dist/index.html..."
Dim patchExit
patchExit = shell.Run("cmd /c node -e ""const f=require('fs');const q=String.fromCharCode(34);const a='<script type='+q+'module'+q+' crossorigin>';const b='<script type='+q+'module'+q+'>';let s=f.readFileSync('dist/index.html','utf8');s=s.split(a).join(b);f.writeFileSync('dist/index.html',s);"" 2>&1", 0, True)
If patchExit <> 0 Then
    Log "WARNING: patch exit code = " & patchExit
Else
    Log "Patch done"
End If

' Launch Electron detached, hidden
Log "Launching: cmd /c npx electron"
shell.Run "cmd /c npx electron .", 0, False
Log "Electron launch issued. Script exiting."
Log "=== Boot Launcher Complete ==="

logStream.Close
Set logStream = Nothing
Set shell = Nothing
Set fs = Nothing
