# Agent / AI instructions (Pulse Trezor program)

You are helping **ihelpmaybe** and contributor **[@togosh](https://github.com/togosh)** on the PulseChain ↔ Trezor program.

## Efficiency (read once)

**[PRODUCT-LAW.md](./PRODUCT-LAW.md)** = **Pulse Perch** = MetaMask replacement for Pulse (non-negotiable) · transport today = Trezor/Suite (swappable) · **[PRIORITY.md](./PRIORITY.md)** = Tip↔HWW Gate · **[PULSE-HIVE.md](./PULSE-HIVE.md)** = **all PulseChain** · **[CORE-APPS.md](./CORE-APPS.md)** · **[OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md)** · **[BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md)**

## Load order (minimum tokens)

0. **[PRODUCT-LAW.md](./PRODUCT-LAW.md)** — **Pulse Perch** success = bag/send/approve/Sites/sign **without MetaMask**. Product name ≠ transport (Trezor/Suite today, swappable). Do not redefine as custody-only.  
1. **[PRIORITY.md](./PRIORITY.md)** — if you can own the lowest unchecked **#**, take it  
2. Else / **any non-Trezor Pulse work** / **end-of-month spare tokens** / blocked → **[PULSE-HIVE.md](./PULSE-HIVE.md)** lowest free **H#** (or SPARE)  
3. Open the **repo named in that row** → that repo’s `TODO.md`  
4. Repo `NOTES.md` **if blocked**  
5. [TESTING.md](./TESTING.md) when testing / claiming done  
6. HELPFUL-NOTES only if needed  

Do **not** reread END-TO-END / ROADMAP / ADOPTION unless planning.

## How to work

- Announce: `Taking PRIORITY #N …` **or** `Taking HIVE H# …` then implement **only** that id.  
- Name the **OSS/vault row** you’re wrapping; feature must serve **PulseChain / HEX / PulseX / ProveX**.  
- Smallest slice → smoke evidence → tick **repo TODO + PRIORITY or HIVE row** → stop.  
- Shared packs → `pulse-trezor-platform`. No fake Trezor HD. No Suite redistribute.  
- SYNC watch-only; AI never holds keys.  
- BONUS / P4 only after Gate 1–2. Parallel agents = **different # / H#**.  

## Pulse Perch — agent policy (hard rule)

When driving **Pulse Perch** (this app’s wallet face):

1. Read `window.__pulsePerchAi.getPrefs()` (or `may(cap)`) **before** any agent action.  
2. Use **only** the bridge for agent money paths:
   - `requestExplain` / `requestSimulate` / `requestPrepare` / `requestSign`
3. If a call throws `AgentPolicyError` / `AGENT_POLICY_DENIED` — **stop**. Do not retry via Send UI, WC paste, or raw `sendPlsWithTrezor`.  
4. `allowSign` defaults **off**. Never ask the user to flip it unless they asked for agent signing.  
5. Human clicks and WalletConnect dapps are separate — do not treat those as a bypass for denied agent caps.  
6. Device confirm is still required for any allowed sign.  

- **Hive never empty:** if SPARE is thin, run the SPARE generator in PULSE-HIVE.md.

## Sibling repos

| Repo | Role |
|------|------|
| `pulse-trezor` | Desk (this) |
| `Tip-wallet` | Android soft |
| `pulse-trezor-platform` | Sync / OS / MPC / AI |
| `pulse-trezor-firmware` | GPL firmware |
| `pulse-trezor-suite` | Suite study (no redistribute) |
| `hexican-rescue` | Bunker registry |
| `pulse-trezor-guides` | Docs |

Each has its own `TODO.md` + `AGENTS.md`. Open the repo that owns the task.

## Contributors

- [@ihelpmaybe](https://github.com/ihelpmaybe) — owner
- [@togosh](https://github.com/togosh) — contributor (welcome to drive TODO items with AI credits)
