# Agent / AI instructions (Pulse Trezor program)

You are helping **ihelpmaybe** and contributor **[@togosh](https://github.com/togosh)** on the PulseChain ↔ Trezor program.

## Efficiency (read once)

**[BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md)** — no redo, shared packs first, context diet, ship-order only.

## Load order (minimum tokens)

1. [TODO.md](./TODO.md) — **this repo only**; first unchecked ship-order item  
2. Repo `NOTES.md` **if blocked**  
3. [TESTING.md](./TESTING.md) **only when adding tests / claiming done**  
4. [HELPFUL-NOTES.md](./HELPFUL-NOTES.md) **section search**, not full reread  
5. END-TO-END / ROADMAP / ACCEPTANCE / ADOPTION — **planning tasks only**, not every feature PR  

## How to work

- One TODO row → smallest slice → smoke evidence → **tick the box** → stop.  
- Shared stuff → `pulse-trezor-platform` (don’t copy token lists / registry formats).  
- Connect → Bridge → device/emu only — **no fake “Trezor” HD**.  
- Suite = study/upstream; **no redistribute**. Tip ≠ Desk; SYNC = watch-only.  
- AI never holds keys / auto-signs.  
- Do **not** replan E2E, re-explain T-RSL, or expand GROWTH before Gate 1 smoke.  
- Parallel agents (@togosh): **different TODO rows**, never the same feature twice.

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
