# Launch a dedicated Chrome profile with Pulse Perch MV3 loaded unpacked + CDP.
# Cursor's browser cannot load unpacked extensions — use this for inject lab.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\chrome-ext-lab.ps1

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$ext = Join-Path $repo "extension"
# lab2: Preferences-seeded unpacked (Chrome 157 ignores --load-extension)
$profile = if ($env:CHROME_PROFILE) { $env:CHROME_PROFILE } else { Join-Path $repo "tmp-chrome-ext-lab2" }
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

# Chrome must be closed for this profile when seeding. Prefer existing seed script.
$env:CHROME_PROFILE = $profile
$env:EXT_DIR = $ext
node (Join-Path $PSScriptRoot "ext-seed-unpacked-prefs.mjs")
if ($LASTEXITCODE -ne 0) { throw "ext-seed-unpacked-prefs failed" }

# load-extension flags are belt-and-suspenders (often ignored on Chrome 157+).
# If still missing: chrome://extensions → Load unpacked → extension/
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
Write-Host "Profile:$profile"
Write-Host "CDP:    http://127.0.0.1:$port"
Write-Host "Chrome 157+ often ignores --load-extension and wipes Preference seeds."
Write-Host "One-time: chrome://extensions → Developer mode → Load unpacked → $ext"
Write-Host "Then: `$env:CDP_PORT=$port; node scripts/ext-cdp-smoke.mjs"
Start-Process -FilePath $chrome -ArgumentList $chromeArgs
