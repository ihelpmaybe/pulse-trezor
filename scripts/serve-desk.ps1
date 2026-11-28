# Pulse Perch — local static server for the portable web pack (normie zip).
# Serves this folder on localhost and opens the browser.
# Suite still required for Trezor. No Node.
# Designed to run hidden (Open-Pulse-Perch.vbs). Quit from the desk UI.

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$preferredPorts = 5174..5184
$script:ShouldStop = $false

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
  # Visible only when launched via Debug cmd; hidden VBS users see nothing —
  # still write a log next to the pack for support.
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
  try {
    $ctx = $listener.GetContext()
  } catch {
    break
  }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = $req.Url.AbsolutePath.TrimEnd("/")
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "/" }

    if ($path -eq "/__perch/local") {
      Write-JsonResponse $res 200 '{"local":true,"product":"pulse-perch"}'
      continue
    }

    if ($path -eq "/__perch/quit" -and ($req.HttpMethod -eq "POST" -or $req.HttpMethod -eq "GET")) {
      Write-JsonResponse $res 200 '{"ok":true,"stopping":true}'
      $script:ShouldStop = $true
      try { $listener.Stop() } catch { }
      continue
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
