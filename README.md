# Pulse Perch

**PulseChain MetaMask replacement** — bag, send, Sites (WalletConnect), sign. Standalone page is a thin shell; embedders import `PulseTrezor`.

**Naming:** product = **Pulse Perch**. Transport today = Trezor Connect → Suite (swappable later). Code ids may still say `pulse-trezor` — internals only.

- Not an app directory. Not a PulseX/HEX clone.
- Sites / WC host: `src/wc/`.

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

## Local demo shell

```bash
npm run setup
npm run dev
```

Opens on `http://127.0.0.1:5174` → mounts `<PulseTrezor />` (mainnet). Lab: pass `showTestnet`.

## Embed

```tsx
import { PulseTrezor } from "pulse-trezor-desk"; // or relative src

<PulseTrezor />                 // mainnet PulseChain
<PulseTrezor showTestnet />     // lab: testnet toggle
<PulseTrezor rpc="https://your-node.example" />  // host-forced RPC
```

Collapsed **Settings** = optional custom RPC URL (or official default). Host apps can hide it with `showSettings={false}`.

Also exported: Connect helpers + `sendPlsWithTrezor` + `RpcOverride` from `src/index.ts`.

## Status

**Early preview / PRODUCT-LAW** — MetaMask-replacement path: Connect · balances · send · approve · **Sites (WalletConnect → any Pulse dapp)** · RPC. Needs Trezor Suite (Connect 10) + free Reown project id for WC. Not official Trezor Pulse support. Device smoke: `tests/smoke/`.
