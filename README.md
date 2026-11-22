# Pulse Trezor

End-to-end **PulseChain ↔ Trezor** for core apps: **PulseChain · HEX · PulseX · ProveX**.

- **Desk (this repo):** Trezor Connect wallet for that loop (Suite replacement for Pulse).
- **Tip:** soft mobile (PulseX + pay links) — sibling.
- **Suite / firmware / rescue / guides / platform:** supporting tracks.

## Docs

- [PRIORITY.md](./PRIORITY.md) — **Gate-critical build queue (AIs start here if free)**
- [PULSE-HIVE.md](./PULSE-HIVE.md) — **always-on PulseChain hive (anything Pulse needs — not just Trezor; spare tokens)**
- [CORE-APPS.md](./CORE-APPS.md) — PulseChain · HEX · PulseX · ProveX only
- [OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md) — adopt/wrap OSS vs build new
- [TODO.md](./TODO.md) — **this repo’s checklist** (Desk)
- [AGENTS.md](./AGENTS.md) — AI/contributor entry → PRIORITY then TODO
- [CONTRIBUTORS.md](./CONTRIBUTORS.md) — includes @togosh
- [HELPFUL-NOTES.md](./HELPFUL-NOTES.md) — operator gotchas / reuse / licenses
- [ADOPTION.md](./ADOPTION.md) — software levers that pull people onto Pulse
- [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md) — no redo / shared-first / AI token diet
- [TESTING.md](./TESTING.md) — smoke / fuzz / pen / full bar (program)
- [ACCEPTANCE.md](./ACCEPTANCE.md) — E2E journey audit + ship gates
- [ROADMAP.md](./ROADMAP.md) — master program todo
- [END-TO-END.md](./END-TO-END.md) — full stack map

## Sibling repos

| Repo | Role |
|------|------|
| [pulse-trezor](https://github.com/ihelpmaybe/pulse-trezor) | Desk + master plan (HWW) |
| [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet) | **Existing** Pulse Android soft wallet (public) |
| [pulse-trezor-suite](https://github.com/ihelpmaybe/pulse-trezor-suite) | Suite study / upstream |
| [pulse-trezor-firmware](https://github.com/ihelpmaybe/pulse-trezor-firmware) | Firmware fork / lab |
| [hexican-rescue](https://github.com/ihelpmaybe/hexican-rescue) | Never-sign bunker |
| [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides) | Normie guides |
| [pulse-trezor-platform](https://github.com/ihelpmaybe/pulse-trezor-platform) | Sync · multi-OS · MPC · AI |

## Desk A0 (local)

```bash
npm run setup
npm run dev
```

Opens on `http://127.0.0.1:5174`. Needs **Trezor Bridge** (:21325). Address path = SYNC0 `m/44'/60'/0'/0/0`.

`setup` = install with scripts off (Windows: Connect’s Stellar `yarn setup || true` breaks cmd) then fetches the esbuild binary.

## Status

**A0–A2 + smoke CI:** Connect, PLS + ERC-20 balances, send, approve (369). Tip TIP1 blocked until Android source path. Device: `tests/smoke/README.md`.
