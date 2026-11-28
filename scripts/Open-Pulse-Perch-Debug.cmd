@echo off
title Pulse Perch (debug)
REM Shows the server window - troubleshooting only.
cd /d "%~dp0"
echo Pulse Perch debug server. Quit from the desk, or close this window.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-desk.ps1"
if errorlevel 1 pause
