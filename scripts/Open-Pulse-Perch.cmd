@echo off
REM Double-click from the unzipped Pulse Perch folder (Windows).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-desk.ps1"
pause
