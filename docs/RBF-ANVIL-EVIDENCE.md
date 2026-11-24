# Anvil RBF evidence (software — not Trezor)

Lab replace-by-fee on Anvil default key. Device proof remains OPEN until Suite + stuck mempool row in RBF-STUCK-PLAYBOOK.md.

| Date | Chain | From | Nonce | Hashes | Action | Result |
|------|-------|------|-------|--------|--------|--------|
| 2026-11-24 | anvil | 0xf39Fd6e5… | nonce 0 | 0x7d02ee9b… → 0xee9ec38c… | cancel-style 0-self @ 125% | PASS |

```
ANVIL_URL=http://127.0.0.1:8545
oldHash=0x7d02ee9b4a1c1b39fa6581b4a8e28f212d1b8fc2291baebe39890d9635628090
newHash=0xee9ec38c48727e309369c8e28b57ce4274853b26c1320144b983fa2b13e0e3bc
status=success
```
