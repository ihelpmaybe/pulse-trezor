# Agent / AI instructions (Pulse Trezor program)

You are helping **ihelpmaybe** and contributor **[@togosh](https://github.com/togosh)** on the PulseChain ↔ Trezor program.

## Load order (do this first)

1. [TODO.md](./TODO.md) — **this repo’s work list** (start at top unchecked items / ship order)
2. [TESTING.md](./TESTING.md) — smoke / fuzz / pen / full; **Gate T blocks ship**
3. [HELPFUL-NOTES.md](./HELPFUL-NOTES.md) — gotchas, licenses, reuse paths
4. [ACCEPTANCE.md](./ACCEPTANCE.md) — journey gates
5. [END-TO-END.md](./END-TO-END.md) / [ROADMAP.md](./ROADMAP.md) — only if you need program context

## How to work

- Pick the **highest unchecked item** in this repo’s TODO ship order (don’t invent a parallel project).
- Prefer existing Connect → Bridge → device/emu path — **no fake “Trezor” HD**.
- Suite is T-RSL: study/upstream only — **do not redistribute** Suite.
- Tip = mobile soft; Desk = HWW. SYNC never moves seeds.
- AI assists may prepare/explain txs — **never hold keys or auto-sign**.
- Every feature needs test evidence per TESTING.md before calling done.
- Update TODO checkboxes in the PR when you finish something.
- Keep changes in **this repo’s scope**; cross-repo work → note sibling TODO + link.

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
