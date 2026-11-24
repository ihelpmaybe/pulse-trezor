# Anvil RBF evidence (software — not Trezor)

**Status:** harness ready (`scripts/rbf-anvil-proof.mjs`) · **anvil not on PATH** in this lab as of 2026-11-24.

Install Foundry → `anvil --port 8545` → `node scripts/rbf-anvil-proof.mjs` to fill the table below.

Unit / ladder proof (always green without Anvil): `src/trezor/rbf.test.ts` · `signPulseTx.fee.test.ts`.

| Date | Chain | From | Nonce | Hashes | Action | Result |
|------|-------|------|-------|--------|--------|--------|
| 2026-11-24 | — | — | — | — | harness only | BLOCKED — install anvil |

Device row: [RBF-STUCK-PLAYBOOK.md](./RBF-STUCK-PLAYBOOK.md).
