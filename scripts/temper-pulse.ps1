# Run / point EnsoBuild Temper at Pulse RPC (fork sim).
# Requires: Docker + Temper image OR cargo build of EnsoBuild/temper.
# Perch Dry-run already POSTs to TEMPER_URL (Settings / VITE_TEMPER_URL).
param(
  [ValidateSet("hint", "docker", "env")]
  [string]$Action = "hint",
  [string]$ForkUrl = "https://rpc.pulsechain.com",
  [string]$Listen = "8080"
)

$ErrorActionPreference = "Stop"

switch ($Action) {
  "hint" {
    @"
Temper × Pulse (don’t invent a sim engine)

1) Self-host Temper with FORK_URL=$ForkUrl
   Example (if you have the Temper binary/image):
     `$env:FORK_URL='$ForkUrl'; temper`   # or: cargo run in EnsoBuild/temper
   Docker (when image available):
     docker run --rm -p ${Listen}:8080 -e FORK_URL=$ForkUrl ghcr.io/ensobuild/temper:latest

2) Perch Settings → Temper URL = http://127.0.0.1:$Listen
   or: `$env:VITE_TEMPER_URL='http://127.0.0.1:$Listen'`

3) Dry-run on Send / WC — Temper first, else one-shot eth_call.

Pulse chainId 369 must be supported by your Temper build’s chain table /
generic fork path. If Temper rejects 369, Anvil fork is the fallback:
  anvil --fork-url $ForkUrl --chain-id 369
  then point a local Temper FORK_URL at http://127.0.0.1:8545

Kill_if: claiming full Tenderly without a running fork.
"@
  }
  "env" {
    Write-Host "FORK_URL=$ForkUrl"
    Write-Host "Set Perch: VITE_TEMPER_URL=http://127.0.0.1:$Listen"
  }
  "docker" {
    Write-Host "Trying docker pull/run Temper (image may differ by tag)…"
    docker run --rm -d --name perch-temper -p "${Listen}:8080" `
      -e "FORK_URL=$ForkUrl" `
      ghcr.io/ensobuild/temper:latest
    Write-Host "If pull failed, build from https://github.com/EnsoBuild/temper and set FORK_URL."
    Write-Host "Perch Temper URL: http://127.0.0.1:$Listen"
  }
}
