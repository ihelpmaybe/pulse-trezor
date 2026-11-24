# Anvil fork of Pulse — Temper FORK_URL fallback when Temper lacks chain 369.
# Requires foundry (anvil) on PATH: https://book.getfoundry.sh/getting-started/installation
param(
  [ValidateSet("hint", "run", "rbf-lab")]
  [string]$Action = "hint",
  [string]$ForkUrl = "https://rpc.pulsechain.com",
  [int]$ChainId = 369,
  [int]$Port = 8545,
  [int]$BlockTime = 0
)

$ErrorActionPreference = "Stop"

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
    $args = @(
      "--fork-url", $ForkUrl,
      "--chain-id", "$ChainId",
      "--port", "$Port"
    )
    if ($BlockTime -gt 0) { $args += @("--block-time", "$BlockTime") }
    Write-Host "anvil $($args -join ' ')"
    & anvil @args
  }
  "rbf-lab" {
    Write-Host "Start anvil in another window if needed, then:"
    Write-Host "  `$env:ANVIL_URL='http://127.0.0.1:$Port'; node scripts/rbf-anvil-proof.mjs"
    $env:ANVIL_URL = "http://127.0.0.1:$Port"
    node "$PSScriptRoot\rbf-anvil-proof.mjs"
  }
}
