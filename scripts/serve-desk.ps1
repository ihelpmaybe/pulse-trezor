# Pulse Perch — local static server for the portable web pack (normie zip).
# Serves this folder on localhost and opens the browser.
# Suite still required for Trezor. No Node.
# Hidden via Open-Pulse-Perch.vbs. Stops on Quit, tab close (bye+grace), or idle.

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
# Do not keep the pack folder as cwd — that locks the folder for delete on Windows.
try { Set-Location -LiteralPath $env:TEMP } catch { }
$preferredPorts = 5174..5184
$script:ShouldStop = $false
$script:LastBeat = [datetime]::UtcNow
$script:StartedAt = [datetime]::UtcNow
$script:SeenClient = $false
$script:PendingBye = $false
$script:ByeAt = $null
# After tab close beacon: wait this long for a refresh/new tab to ping again.
$byeGraceSec = 3
# If the desk stops heartbeating (crash / force-kill tab), exit so the folder unlocks.
$idleQuitSec = 45
# If the browser never loads (or closes before JS), still exit — don't lock forever.
$orphanQuitSec = 90

function Get-ContentType([string]$path) {
  switch -Regex ($path) {
    '\.html$' { "text/html; charset=utf-8"; break }
    '\.js$' { "text/javascript; charset=utf-8"; break }
    '\.css$' { "text/css; charset=utf-8"; break }
    '\.json$' { "application/json"; break }
    '\.webmanifest$' { "application/manifest+json"; break }
    '\.svg$' { "image/svg+xml"; break }
    '\.png$' { "image/png"; break }
    '\.jpe?g$' { "image/jpeg"; break }
    '\.woff2?$' { "font/woff2"; break }
    '\.ico$' { "image/x-icon"; break }
    default { "application/octet-stream" }
  }
}

function Write-JsonResponse($res, [int]$code, [string]$json) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $res.StatusCode = $code
  $res.ContentType = "application/json; charset=utf-8"
  $res.Headers.Add("Cache-Control", "no-store")
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Touch-Beat {
  $script:LastBeat = [datetime]::UtcNow
  $script:SeenClient = $true
  $script:PendingBye = $false
  $script:ByeAt = $null
}

function Test-ShouldIdleQuit {
  $now = [datetime]::UtcNow
  if (-not $script:SeenClient) {
    return (($now - $script:StartedAt).TotalSeconds -ge $orphanQuitSec)
  }
  $idle = ($now - $script:LastBeat).TotalSeconds
  if ($idle -ge $idleQuitSec) { return $true }
  if ($script:PendingBye -and $script:ByeAt) {
    $sinceBye = ($now - $script:ByeAt).TotalSeconds
    if ($sinceBye -ge $byeGraceSec -and $idle -ge ($byeGraceSec - 0.5)) {
      return $true
    }
  }
  return $false
}

# HttpListener is already in System on Windows PowerShell 5.1.
# Do NOT Add-Type System.Net.HttpListener — that assembly name does not exist.
$listener = $null
$prefix = $null
foreach ($port in $preferredPorts) {
  $tryPrefix = "http://127.0.0.1:$port/"
  $try = [System.Net.HttpListener]::new()
  $try.Prefixes.Add($tryPrefix)
  try {
    $try.Start()
    $listener = $try
    $prefix = $tryPrefix
    break
  } catch {
    $try.Close()
  }
}

if (-not $listener) {
  $msg = "Pulse Perch could not start — ports 5174-5184 busy. Close other Perch copies and try again."
  try {
    Set-Content -LiteralPath (Join-Path $root "perch-serve-error.txt") -Value $msg
  } catch { }
  if ([Environment]::UserInteractive -and $Host.Name -eq "ConsoleHost") {
    Write-Host $msg
    pause
  }
  exit 1
}

try {
  Set-Content -LiteralPath (Join-Path $root "perch-serve-url.txt") -Value $prefix
} catch { }

Start-Process $prefix

while ($listener.IsListening -and -not $script:ShouldStop) {
  $ar = $null
  try {
    $ar = $listener.BeginGetContext($null, $null)
  } catch {
    break
  }
  while (-not $ar.IsCompleted) {
    if (Test-ShouldIdleQuit) {
      $script:ShouldStop = $true
      try { $listener.Stop() } catch { }
      break
    }
    Start-Sleep -Milliseconds 200
  }
  if ($script:ShouldStop) { break }
  try {
    $ctx = $listener.EndGetContext($ar)
  } catch {
    break
  }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = $req.Url.AbsolutePath.TrimEnd("/")
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "/" }

    if ($path -eq "/__perch/local") {
      Touch-Beat
      Write-JsonResponse $res 200 '{"local":true,"product":"pulse-perch","autoStop":true}'
      continue
    }

    if ($path -eq "/__perch/ping" -and ($req.HttpMethod -eq "POST" -or $req.HttpMethod -eq "GET")) {
      Touch-Beat
      Write-JsonResponse $res 200 '{"ok":true}'
      continue
    }

    if ($path -eq "/__perch/bye" -and ($req.HttpMethod -eq "POST" -or $req.HttpMethod -eq "GET")) {
      # Tab closing / navigating away — grace so a refresh can re-ping.
      $script:PendingBye = $true
      $script:ByeAt = [datetime]::UtcNow
      Write-JsonResponse $res 200 '{"ok":true,"bye":true}'
      continue
    }

    if ($path -eq "/__perch/quit" -and ($req.HttpMethod -eq "POST" -or $req.HttpMethod -eq "GET")) {
      Write-JsonResponse $res 200 '{"ok":true,"stopping":true}'
      $script:ShouldStop = $true
      try { $listener.Stop() } catch { }
      continue
    }

    # Any real desk asset means a client is alive (first paint before JS heartbeats).
    if ($path -eq "/" -or $path -eq "/index.html") {
      Touch-Beat
    }

    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
    $candidate = Join-Path $root ($rel -replace "/", [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $candidate = Join-Path $root "index.html"
    }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $res.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $bytes = [IO.File]::ReadAllBytes($candidate)
      $res.StatusCode = 200
      $res.ContentType = Get-ContentType $candidate
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    try { $res.StatusCode = 500 } catch { }
  } finally {
    try { $res.OutputStream.Close() } catch { }
  }
}

try { $listener.Close() } catch { }
try {
  Remove-Item -LiteralPath (Join-Path $root "perch-serve-url.txt") -Force -ErrorAction SilentlyContinue
} catch { }
try { Set-Location -LiteralPath $env:TEMP } catch { }
