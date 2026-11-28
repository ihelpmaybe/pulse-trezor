@echo off
REM Double-click this. No black window. Browser opens Perch.
REM When done: Quit (X) in the desk top-right, or Settings -> Quit.
cd /d "%~dp0"
wscript.exe "%~dp0Open-Pulse-Perch.vbs"
