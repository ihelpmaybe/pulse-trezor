' Pulse Perch — silent launcher (no black console).
' Double-click Open-Pulse-Perch.cmd which runs this, or run this .vbs directly.
Option Explicit
Dim sh, fso, dir, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\serve-desk.ps1"""
' 0 = hidden window, False = do not wait
sh.Run cmd, 0, False
