# Official trezor-user-env lab (don’t-pretend).
# Wire stays: Perch → @trezor/connect-web → Suite → Bridge/emu.
# Never soft-seed. Windows uses the mac-style port-mapped Compose service.
param(
  [ValidateSet("status", "up", "down", "ping", "emu-start", "help")]
  [string]$Action = "status",
  [string]$Model = "T3T1",
  [string]$UserEnvRoot = ""
)

$ErrorActionPreference = "Stop"

function Resolve-UserEnvRoot {
  if ($UserEnvRoot -and (Test-Path $UserEnvRoot)) { return (Resolve-Path $UserEnvRoot).Path }
  if ($env:TREZOR_USER_ENV -and (Test-Path $env:TREZOR_USER_ENV)) {
    return (Resolve-Path $env:TREZOR_USER_ENV).Path
  }
  $candidates = @(
    "c:\Users\punki\Desktop\windows-clone\_incoming\wallet-steal\trezor-user-env",
    (Join-Path $PSScriptRoot "..\..\..\windows-clone\_incoming\wallet-steal\trezor-user-env")
  )
  foreach ($c in $candidates) {
    if (Test-Path (Join-Path $c "docker\compose.yml")) { return (Resolve-Path $c).Path }
  }
  throw "trezor-user-env not found. Set TREZOR_USER_ENV or pass -UserEnvRoot."
}

function Invoke-Controller([hashtable]$Body, [int]$TimeoutMs = 4000) {
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $cts = New-Object System.Threading.CancellationTokenSource
  $uri = [Uri]"ws://127.0.0.1:9001/"
  $ok = $ws.ConnectAsync($uri, $cts.Token).Wait($TimeoutMs)
  if (-not $ok) { throw "controller ws://127.0.0.1:9001 connect failed" }

  # Drain welcome
  $recvBuf = New-Object byte[] 65536
  $seg = New-Object ArraySegment[byte] -ArgumentList @(,$recvBuf)
  $null = $ws.ReceiveAsync($seg, $cts.Token).Wait($TimeoutMs)

  if (-not $Body.id) { $Body.id = Get-Random -Maximum 999999 }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Compress))
  $send = New-Object ArraySegment[byte] -ArgumentList @(,$bytes)
  $null = $ws.SendAsync($send, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait(2000)

  $recvBuf2 = New-Object byte[] 65536
  $seg2 = New-Object ArraySegment[byte] -ArgumentList @(,$recvBuf2)
  $recv = $ws.ReceiveAsync($seg2, $cts.Token)
  if (-not $recv.Wait($TimeoutMs)) { throw "controller response timeout" }
  $n = $recv.Result.Count
  $json = [Text.Encoding]::UTF8.GetString($recvBuf2, 0, $n)
  $ws.Dispose()
  return $json
}

function Show-Help {
  @"
lab-user-env.ps1 — official Trezor emu lab for Pulse Perch

  -Action status     Docker + controller background-check
  -Action up         docker compose up trezor-user-env-mac (port-mapped)
  -Action down       stop that service
  -Action ping       controller ping
  -Action emu-start  emulator-start model=$Model (default T3T1)
  -UserEnvRoot PATH  override clone path (or env TREZOR_USER_ENV)

After up: open http://127.0.0.1:9002 · Suite (disable bundled Bridge in Debug if needed) · Perch Connect.
Confirm: .\emu-yes.ps1
Kill_if: labeling software HD as Trezor / skipping Suite.
"@
}

switch ($Action) {
  "help" { Show-Help; break }

  "status" {
    $root = Resolve-UserEnvRoot
    Write-Host "User-env root: $root"
    try {
      $docker = docker ps --format "{{.Names}}" 2>$null
      $hit = $docker | Where-Object { $_ -match "trezor-user-env" }
      if ($hit) { Write-Host "Docker: $($hit -join ', ')" } else { Write-Host "Docker: no trezor-user-env container" }
    } catch {
      Write-Host "Docker: not available ($($_.Exception.Message))"
    }
    try {
      $raw = Invoke-Controller @{ type = "background-check" }
      Write-Host "Controller: $raw"
    } catch {
      Write-Host "Controller: down — $($_.Exception.Message)"
      Write-Host "Hint: -Action up  then dashboard http://127.0.0.1:9002"
    }
  }

  "up" {
    $root = Resolve-UserEnvRoot
    $compose = Join-Path $root "docker\compose.yml"
    Write-Host "Starting trezor-user-env-mac via $compose"
    Push-Location $root
    try {
      docker compose -f ./docker/compose.yml up -d trezor-user-env-mac
    } finally {
      Pop-Location
    }
    Write-Host "Dashboard: http://127.0.0.1:9002"
    Write-Host "Controller: ws://127.0.0.1:9001"
    Write-Host "Then: Suite → (Debug: off bundled Bridge if using user-env Bridge) → Perch Connect"
  }

  "down" {
    $root = Resolve-UserEnvRoot
    Push-Location $root
    try {
      docker compose -f ./docker/compose.yml stop trezor-user-env-mac
    } finally {
      Pop-Location
    }
    Write-Host "Stopped trezor-user-env-mac"
  }

  "ping" {
    $raw = Invoke-Controller @{ type = "ping" }
    Write-Host $raw
  }

  "emu-start" {
    $raw = Invoke-Controller @{ type = "emulator-start"; model = $Model }
    Write-Host $raw
    Write-Host "VNC/dashboard: http://127.0.0.1:9002 — then open Suite and Perch Connect"
  }
}
