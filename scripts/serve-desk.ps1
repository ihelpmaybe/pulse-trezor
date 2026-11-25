# Pulse Perch — local static server for the portable web pack (normie zip).
# Serves this folder on http://127.0.0.1:5174/ and opens the browser.
# Suite still required for Trezor. No Node.

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
$port = 5174
$prefix = "http://127.0.0.1:$port/"

Add-Type -AssemblyName System.Net.HttpListener
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Port $port busy — close the other Perch window or free the port."
  Write-Host $_
  pause
  exit 1
}

Write-Host "Pulse Perch desk: $prefix"
Write-Host "Leave this window open. Unlock Trezor Suite, then Connect in the browser."
Write-Host "Ctrl+C to stop."
Start-Process $prefix

function Get-ContentType([string]$path) {
  switch -Regex ($path) {
    '\.html$' { "text/html; charset=utf-8"; break }
    '\.js$' { "text/javascript; charset=utf-8"; break }
    '\.css$' { "text/css; charset=utf-8"; break }
    '\.json$' { "application/json"; break }
    '\.webmanifest$' { "application/manifest+json"; break }
    '\.svg$' { "image/svg+xml"; break }
    '\.png$' { "image/png"; break }
    '\.woff2?$' { "font/woff2"; break }
    '\.ico$' { "image/x-icon"; break }
    default { "application/octet-stream" }
  }
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
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
    $res.StatusCode = 500
  } finally {
    $res.OutputStream.Close()
  }
}
