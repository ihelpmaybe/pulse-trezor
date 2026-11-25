# Stuck-tx RBF proof (Speed up / Cancel)

**Code:** `bumpFees` / `bumpFeesAtStep` (ynatm ladder 125→150→200→300→500%) + local pending-nonce track (`src/trezor/rbf.ts`) + `onSpeedUp` / `onCancelStuck` in `useDeskSend`. Units: `signPulseTx.fee.test.ts` · `rbf.test.ts`.

**Live proof status (this lab):**
- **Anvil (software):** run `scripts/rbf-anvil-proof.mjs` → `docs/RBF-ANVIL-EVIDENCE.md` (not a Trezor claim).
- **Device / Suite:** OPEN until a real pending tx is observed and replaced. Prefer **v4testnet (943)**.
- **Face soft path (2026-11-24):** pending Speed up / Cancel shows coach copy (`src/trezor/rbfSoftPath.ts`) — fee math PASS, device mempool still OPEN. Do not tick Gate RBF live from that strip alone.

## Prove it (device or emu + Suite)

1. Desk on **943** · Connect · note derivation index.
2. Send a tiny self-transfer with **very low** maxFee (Advanced fees if exposed, or flood the mempool until one sticks pending). Goal: Status = pending, Speed up / Cancel visible on Activity.
3. **Speed up** → Suite confirm → new hash, same nonce, higher fee → wait confirmed. Or **Cancel** → 0-value self, same nonce. Repeat Speed up to climb the ladder.
4. Record: chainId · from · nonce · oldHash · newHash · which button · date.
5. Paste one line under **Evidence** below. Mark Gate checklist RBF live = done.

## Lab Anvil (no device)

```powershell
anvil --port 8545
# other window:
$env:ANVIL_URL='http://127.0.0.1:8545'; node scripts/rbf-anvil-proof.mjs
# or: .\scripts\anvil-pulse.ps1 -Action rbf-lab
```

## Evidence (device)

| Date | Chain | Path | Result |
|------|-------|------|--------|
| 2026-11-24 | 943 | Desk→Suite “Confirm on Trezor” (self 0.0001 tPLS, addr 0x73d0…36A8, nonce 39) | OPEN — Suite prompt reached; device button never completed; no Speed up evidence |
| — | — | — | OPEN — fee math + Anvil lab green; device replace not run |

## Not pretending
Unit / Anvil bump ≠ Trezor mempool RBF. Device row stays OPEN until Suite + stuck wire.
