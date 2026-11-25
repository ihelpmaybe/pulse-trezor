# Stuck-tx RBF proof (Speed up / Cancel)

**Code:** `bumpFees` / `bumpFeesAtStep` (ynatm ladder 125→150→200→300→500%) + local pending-nonce track (`src/trezor/rbf.ts`) + `onSpeedUp` / `onCancelStuck` in `useDeskSend`. Units: `signPulseTx.fee.test.ts` · `rbf.test.ts`.

**Live proof status (this lab):**
- **Anvil (software):** run `scripts/rbf-anvil-proof.mjs` → `docs/RBF-ANVIL-EVIDENCE.md` (not a Trezor claim).
- **Device / Suite:** PASS on **943** (2026-11-24) — see Evidence. Prefer dust tips (≤1 wei) so the stuck row survives long enough for Speed up.
- **Face soft path:** coach copy still useful; device row is no longer OPEN.

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
| 2026-11-24 | 943 | Desk→emu YES→Speed up (+25%) · from `0x73d0…36A8` · nonce **41** · tip 1→1 wei · max 20→25 wei · old `0xd2e54cdc…d6a2` → new `0x469f3e61…30dd` | **PASS** — device signed both; RPC dropped old after replace; new stayed pending (dust tip) |
| 2026-11-24 | 943 | nonce **41** override · tip **10000** / max **10020** beats · replaced dust `0x469f…30dd` so WC nonce 42 could mine | **PASS** — cleared queue; Instant (~1e6 beats) rejected (bag too small) |
| 2026-11-24 | 943 | earlier Speed up race (tip 1 beat) · old `0xc606…bf6e` mined before replace broadcast | FAIL race — device signed Speed up; `eth_sendRawTransaction` rejected (nonce already mined). Use wei-scale tips. |

```
chainId=943
from=0x73d0385F4d8E00C5e6504C6030F47BF6212736A8
nonce=41
oldHash=0xd2e54cdc4198e7e4f52377c4ade23da3e0afaa7b0c079d47098b1151b382d6a2
newHash=0x469f3e614501fd81074fffc56bfb504989898e0c64046b4413b8a6e13b8730dd
action=Speed up (+25%)
device=PQQ-SMOKE emu via Suite Desktop Connect 10
```

## Not pretending
Unit / Anvil bump ≠ Trezor mempool RBF. Device row above is Suite + emu wire, same Connect path as a real Trezor.
