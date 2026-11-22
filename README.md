# Pulse Trezor

End-to-end **PulseChain** support for **Trezor** — without MetaMask/Rabby as the daily driver.

Device firmware already signs chain **369**. Trezor Suite does not surface Pulse. This repo is the product that fills that gap via **Trezor Connect + Bridge** (real device path only).

## Sibling private repos

| Repo | Role |
|------|------|
| **pulse-trezor** (this) | Desk / wallet / DeFi / HEX companion |
| [hexican-rescue](https://github.com/ihelpmaybe/hexican-rescue) | Never-sign bunker registry (quantum-prep safety) |
| [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides) | Normie guides, funnel, support docs |

## Status

Scaffold + roadmap. See [ROADMAP.md](./ROADMAP.md).

## Non-goals (for now)

- Custom Trezor firmware
- Post-quantum signatures on-device (chain must accept first)
- Forking Trezor Suite under T-RSL for redistribution
