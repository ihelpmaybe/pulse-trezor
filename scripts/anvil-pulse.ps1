# Anvil fork of Pulse — Temper FORK_URL fallback when Temper lacks chain 369.
# Requires foundry (anvil). Prefers PATH, else %USERPROFILE%\.foundry\bin\anvil.exe
param(
  [ValidateSet("hint", "run", "rbf-lab")]
  [string]$Action = "hint",
  [string]$ForkUrl = "https://rpc.pulsechain.com",
  [int]$ChainId = 369,
  [int]$Port = 8545,
  [int]$BlockTime = 0
)

$ErrorActionPreference = "Stop"

function Resolve-Anvil {
  $cmd = Get-Command anvil -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:USERPROFILE ".foundry\bin\anvil.exe"
  if (Test-Path $fallback) { return $fallback }
  throw "anvil not found — install Foundry or add ~/.foundry/bin to PATH"
}

switch ($Action) {
  "hint" {
    @"
Anvil × Pulse (Temper fallback)

  anvil --fork-url $ForkUrl --chain-id $ChainId --port $Port

Temper: set FORK_URL=http://127.0.0.1:$Port then start Temper.
Perch: Settings → Temper URL, or RPC override http://127.0.0.1:$Port for local sends.

RBF lab (no device):  .\scripts\anvil-pulse.ps1 -Action rbf-lab
  Uses anvil account #0 + scripts/rbf-anvil-proof.mjs
Kill_if: calling Anvil a Trezor proof — device proof stays in RBF-STUCK-PLAYBOOK.md
"@
  }
  "run" {
    $anvil = Resolve-Anvil
    $args = @(
      "--fork-url", $ForkUrl,
      "--chain-id", "$ChainId",
      "--port", "$Port"
    )
    if ($BlockTime -gt 0) { $args += @("--block-time", "$BlockTime") }
    Write-Host "$anvil $($args -join ' ')"
    & $anvil @args
  }
  "rbf-lab" {
    $anvil = Resolve-Anvil
    Write-Host "Starting $anvil --port $Port --no-mining (background)…"
    $proc = Start-Process -FilePath $anvil -ArgumentList @("--port", "$Port", "--no-mining") -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 1
    try {
      $env:ANVIL_URL = "http://127.0.0.1:$Port"
      node "$PSScriptRoot\rbf-anvil-proof.mjs"
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
      if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    }
  }
}
