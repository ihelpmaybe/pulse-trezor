# Agent / AI instructions (Pulse Trezor program)

You are helping **ihelpmaybe** and contributor **[@togosh](https://github.com/togosh)** on the PulseChain ↔ Trezor program.

## Efficiency (read once)

**[PRIORITY.md](./PRIORITY.md)** = Gate-critical queue · **[PULSE-HIVE.md](./PULSE-HIVE.md)** = always-on PulseChain backlog (spare tokens) · **[CORE-APPS.md](./CORE-APPS.md)** · **[OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md)** · **[BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md)**

## Load order (minimum tokens)

1. **[PRIORITY.md](./PRIORITY.md)** — if you can own the lowest unchecked **#**, take it  
2. Else / **end-of-month spare tokens** / blocked → **[PULSE-HIVE.md](./PULSE-HIVE.md)** lowest free **H#** (or Band SPARE)  
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
- SYNC watch-only; AI never signs/holds keys.  
- BONUS / P4 only after Gate 1–2. Parallel agents = **different # / H#**.  
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
