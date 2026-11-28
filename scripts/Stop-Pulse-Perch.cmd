@echo off
REM Force-stop the hidden Perch server for THIS folder (unlocks delete).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path -LiteralPath '%~dp0').Path.TrimEnd('\');" ^
  "$n = 0;" ^
  "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {" ^
  "  $_.Name -match 'powershell|pwsh' -and $_.CommandLine -and (" ^
  "    $_.CommandLine -like ('*' + $root + '*serve-desk.ps1*')" ^
  "  )" ^
  "} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $n++ };" ^
  "if ($n -eq 0) { Write-Host 'No Perch server was running for this folder.' } else { Write-Host ('Stopped ' + $n + ' Perch server(s). Folder should unlock in a second.') };" ^
  "Start-Sleep -Seconds 1"
pause
