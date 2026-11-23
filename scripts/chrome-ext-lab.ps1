# Launch a dedicated Chrome profile with Pulse Perch MV3 loaded unpacked + CDP.
# Cursor's browser cannot load unpacked extensions — use this for inject lab.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\chrome-ext-lab.ps1

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$ext = Join-Path $repo "extension"
$profile = Join-Path $repo "tmp-chrome-ext-lab"
$port = if ($env:CDP_PORT) { [int]$env:CDP_PORT } else { 9233 }

$chromeCandidates = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw "Chrome not found" }
if (-not (Test-Path $ext)) { throw "Missing extension folder: $ext" }

New-Item -ItemType Directory -Force -Path $profile | Out-Null

# Fresh profile + only our ext. Chrome 137+ needs DisableLoadExtensionCommandLineSwitch off.
# If Perch still missing after launch: chrome://extensions → Developer mode → Load unpacked → extension/
$chromeArgs = @(
  "--user-data-dir=$profile",
  "--remote-debugging-port=$port",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-features=DisableLoadExtensionCommandLineSwitch",
  "--disable-extensions-except=$ext",
  "--load-extension=$ext",
  "http://127.0.0.1:5174/",
  "chrome://extensions/"
)

Write-Host "Chrome: $chrome"
Write-Host "Ext:    $ext"
Write-Host "CDP:    http://127.0.0.1:$port"
Write-Host "If Pulse Perch is missing on chrome://extensions → Load unpacked → $ext"
Start-Process -FilePath $chrome -ArgumentList $chromeArgs
