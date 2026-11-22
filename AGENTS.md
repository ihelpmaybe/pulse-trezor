# Agent / AI instructions (Pulse Trezor program)

You are helping **ihelpmaybe** and contributor **[@togosh](https://github.com/togosh)** on the PulseChain ↔ Trezor program.

## Efficiency (read once)

**[PRIORITY.md](./PRIORITY.md)** = build queue · **[CORE-APPS.md](./CORE-APPS.md)** = PulseChain·HEX·PulseX·ProveX · **[OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md)** · **[BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md)**

## Load order (minimum tokens)

1. **[PRIORITY.md](./PRIORITY.md)** — take lowest unchecked **#** (or skip if another agent owns it)  
2. Open the **repo named in that row** → that repo’s `TODO.md` for the TODO id  
3. Repo `NOTES.md` **if blocked**  
4. [TESTING.md](./TESTING.md) when testing / claiming done  
5. HELPFUL-NOTES section search only if needed  

Do **not** reread END-TO-END / ROADMAP / ADOPTION unless planning.

## How to work

- Announce: `Taking PRIORITY #N …` then implement **only** that id.  
- Name the **OSS/vault row** you’re wrapping; feature must serve **PulseChain / HEX / PulseX / ProveX**.  
- Smallest slice → smoke evidence → tick **repo TODO + PRIORITY row** → stop.  
- Shared packs → `pulse-trezor-platform`. No fake Trezor HD. No Suite redistribute.  
- SYNC watch-only; AI never signs/holds keys.  
- BONUS / P4 only after Gate 1–2. Parallel agents = **different PRIORITY #s**.

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
