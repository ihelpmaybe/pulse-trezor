# Testing bar — Pulse Trezor program

**Nothing ships a Gate without its test evidence.**  
Tick only with: test name · command · date · device/emu note (if HWW).

Applies to every repo. Copy the matching section into that repo’s CI; keep this file as the **program standard**.

---

## Four bars (definitions)

| Bar | Meaning | Fail = |
|-----|---------|--------|
| **SMOKE** | Happy path works on a clean machine / emu in &lt; N minutes | Can’t connect, receive, or send once |
| **FUZZ** | Malformed / adversarial inputs don’t crash, leak, or corrupt state | Unhandled throw, bad decode accepted, state desync |
| **PEN** | Hostile review: authz, phishing UX, key/seed handling, supply chain | Funds-at-risk or seed exposure path |
| **FULL** | Matrix: OS × device × feature; regressions green; ACCEPTANCE gate | Any Gate 1–3 checkbox without evidence |

**HWW rule (`dont-pretend`):** device tests use **Connect → Bridge → real device or official emulator**. No fake “Trezor” HD shortcuts labeled as hardware.

**AI rule:** pen includes “model never sees seed / never signs.”

**Tick rule:** no checkbox without artifact (CI log, forge output, manual checklist file).

---

## Matrix owners

| Repo | SMOKE | FUZZ | PEN | FULL |
|------|-------|------|-----|------|
| `pulse-trezor` (Desk) | Connect, receive, send PLS | RPC/tx/token/path inputs | Phishing UI, approvals, WC | OS × Safe 3/5/7 × features |
| `Tip-wallet` | Install, receive, send, swap | EIP-681 / QR / deep links | Seed backup, clipboard, sideload | Android × Graphene × release |
| `pulse-trezor-platform` | SYNC import/export roundtrip | Registry JSON / QR payloads | Sync never moves seed; MPC threat | Sync × Tip×Desk versions |
| `hexican-rescue` | forge test + deploy smoke | Calldata / rebind fuzz | Stolen-EOA cannot rebind | Mainnet verify + UI register |
| `pulse-trezor-firmware` | emu boot + sign PLS | Token/network def edge cases | Unsigned-build labeling; no pretend | Model matrix emu |
| `pulse-trezor-suite` | Gap-map freshness | N/A (notes) | T-RSL / no-redistribute audit | SU5 parity doc vs Desk FULL |
| `pulse-trezor-guides` | Link checker / glossary | N/A | Scam/fake-Suite warnings accurate | Gate docs match ACCEPTANCE |

---

## SMOKE (minimum scripts)

### Desk
1. Warm Connect + see device  
2. Show address == device screen  
3. PLS balance fetch  
4. Send dust PLS (testnet preferred) → confirmed  
5. ERC-20 transfer once  
6. Disconnect → watch-only still loads registry  

### Tip
1. Fresh install / update-over-install  
2. Create or restore wallet  
3. Receive address + send once  
4. PulseX quote → swap once (testnet or tiny)  
5. EIP-681 open → prefill correct chain/amount  

### Rescue
1. `forge test` all green  
2. Register bunker on test deploy  
3. Attacker EOA cannot rebind  
4. Bunker can rebind/clear  

### Firmware
1. Emulator starts; Bridge lists it  
2. Derive addr; sign PLS; sign ERC-20  
3. Unknown token still signs with clear warning  

### Platform SYNC
1. Export registry Tip → import Desk (and reverse)  
2. QR pair produces same watch-only set  
3. Reject payload that embeds mnemonic/xprv  

---

## FUZZ (minimum targets)

| Surface | Examples |
|---------|----------|
| Addresses | wrong checksum, wrong chain, truncated, EIP-55 vs lower |
| Amounts | 0, dust, max uint, decimals overflow, scientific notation |
| Paths | wrong BIP44, hardened gaps, account 9999 |
| Tx fields | bad nonce, huge gas, empty data, wrong chainId |
| EIP-681 / QR | wrong scheme, XSS-ish strings, oversized URI |
| Registry JSON | missing fields, extra fields, path≠address, huge arrays |
| RPC errors | timeout, 429, HTML error body, fork mismatch |
| Token meta | spoof symbol, 0 decimals, malicious logo URL |
| WC sessions | replay, wrong chain, session replace |

Implement with property tests / rapidcheck-style / foundry fuzz / custom JS fuzz — pick per stack. **CI must run a fuzz job** (time-boxed OK).

---

## PEN (minimum themes)

### Custody / keys
- [ ] Seed/mnemonic never in logs, analytics, AI prompts, SYNC payloads  
- [ ] Clipboard clear / warn after seed show (Tip)  
- [ ] No private key export in HWW path  
- [ ] Passphrase not written to disk plaintext  

### Transaction / phishing
- [ ] Clear-sign: chain name PulseChain, not “Ethereum”  
- [ ] Spender/approve amounts human-readable  
- [ ] WC/dapp origin shown before sign  
- [ ] Address book warn on first send to new addr  
- [ ] Blind `data` hex requires extra confirm  

### Authz / contracts (Rescue + Desk)
- [ ] Stolen EOA cannot change bunker  
- [ ] Rebind only from current bunker  
- [ ] No admin backdoor in registry  

### Supply chain
- [ ] Lockfiles committed; Dependabot or equiv  
- [ ] Connect/Bridge versions pinned + noted  
- [ ] Sideload APK checksum published (Tip)  
- [ ] Suite track: no accidental public redistribute  

### AI / MPC
- [ ] AI cannot sign; prepare-only  
- [ ] MPC shares never reconstitutable from one device alone  
- [ ] Threat model doc matches OPS0  

**Pen deliverable:** short report (Critical/High/Med/Low) + PoC or forge test name. Re-run before each Gate ship.

---

## FULL bar (matrix)

Before **ACCEPTANCE Gate 1–3**:

| Dimension | Cases |
|-----------|--------|
| OS | Win, Lin, Mac, Web (Desk); Android, Graphene (Tip) |
| Device | Safe 3, Safe 5, Safe 7 (+ emu) |
| Feature | receive, send PLS, ERC-20, approve, swap, HEX view, SYNC, bunker |
| Network | 369 main · 943 testnet |
| Negatives | Bridge down, wrong network, insufficient gas, user cancel on device |

**FULL = SMOKE × matrix + FUZZ job green + PEN report &lt; Gate age (e.g. 30 days) + no open Critical.**

---

## CI expectations (every code repo)

- [ ] `smoke` workflow on PR  
- [ ] `fuzz` workflow scheduled or on PR (time box)  
- [ ] `pen` checklist artifact required for release tags  
- [ ] Device/emu job marked `manual` or self-hosted if needed — still documented  

Guides/Suite notes repos: link-check + pen copy review instead of runtime fuzz.

---

## Evidence layout (suggested)

```
tests/smoke/
tests/fuzz/
tests/pen/REPORT.md
tests/full/MATRIX.md
```

Fail closed: release blocked if MATRIX row red.
