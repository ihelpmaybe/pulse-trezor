# Stuck-tx RBF proof (Speed up / Cancel)

**Code:** `bumpFees` (≥12.5% / default 1.25×) + `onSpeedUp` / `onCancelStuck` in `useDeskSend` — unit-tested in `signPulseTx.fee.test.ts`.

**Live proof status (this lab):** OPEN until a real pending tx is observed and replaced. Prefer **v4testnet (943)** so mainnet dust is not required.

## Prove it (device or emu + Suite)

1. Desk on **943** · Connect · note derivation index.
2. Send a tiny self-transfer with **very low** maxFee (Advanced fees if exposed, or flood the mempool until one sticks pending). Goal: Status = pending, Speed up / Cancel visible on Activity.
3. **Speed up** → Suite confirm → new hash, same nonce, higher fee → wait confirmed. Or **Cancel** → 0-value self, same nonce.
4. Record: chainId · from · nonce · oldHash · newHash · which button · date.
5. Paste one line under **Evidence** below. Mark Gate checklist RBF live = done.

## Evidence

| Date | Chain | Path | Result |
|------|-------|------|--------|
| — | — | — | OPEN — fee math green; live replace not run |

## Not pretending
Unit bump ≠ live RBF. UI wiring exists; mempool replace needs a stuck tx on a real wire.
