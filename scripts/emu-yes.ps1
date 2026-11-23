# Slow trezor-user-env YES taps (ws://127.0.0.1:9001).
# Fast spam → Suite "button request already pending".
param(
  [int]$Count = 3,
  [int]$DelayMs = 1800
)

for ($i = 1; $i -le $Count; $i++) {
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $cts = New-Object System.Threading.CancellationTokenSource
  $uri = [Uri]'ws://127.0.0.1:9001/'
  if (-not $ws.ConnectAsync($uri, $cts.Token).Wait(3000)) {
    Write-Error "emu ws connect failed"
    exit 1
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes('{"type":"emulator-press-yes"}')
  $buf = New-Object ArraySegment[byte] -ArgumentList @(,$bytes)
  $ws.SendAsync($buf, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait(2000) | Out-Null
  Write-Host "YES $i/$Count"
  $ws.Dispose()
  if ($i -lt $Count) { Start-Sleep -Milliseconds $DelayMs }
}
