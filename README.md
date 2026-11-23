# Pulse Perch

**PulseChain MetaMask replacement** for a real Trezor — bag, send, approve, Sites (WalletConnect). Suite hosts the device; Perch is the Pulse UI.

**Start here → [TRY.md](./TRY.md)** (clone → Suite → Connect → testnet)

- Not an app directory. Not a PulseX/HEX clone.
- Not official Trezor Pulse support (Suite still doesn’t list Pulse).
- Code repo id may still say `pulse-trezor` — product name is **Pulse Perch**.

## Try it (90-second version)

```bash
git clone https://github.com/ihelpmaybe/pulse-trezor.git
cd pulse-trezor
npm run setup
npm run dev
```

Open **http://127.0.0.1:5174/** · unlock Trezor in **Suite** · **Connect** in Perch · confirm address on device.

Lab shell defaults to **testnet 943**. Full steps + extension: [TRY.md](./TRY.md).

## Normie guides

- [Try Perch](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/try-perch.md)
- [What works today](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/status.md)
- [Trezor on Pulse](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/trezor-on-pulse.md)
- [Bridge → receive](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/bridge-receive.md)

## Sibling repos

| Repo | Role |
|------|------|
| [pulse-trezor](https://github.com/ihelpmaybe/pulse-trezor) | Desk (this repo) |
| [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides) | Normie guides |
| [pulse-trezor-platform](https://github.com/ihelpmaybe/pulse-trezor-platform) | Watch registry / badge packs |
| [pulse-trezor-suite](https://github.com/ihelpmaybe/pulse-trezor-suite) | Suite gap study |
| [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet) | Soft Android wallet (separate lane) |

## Embed

```tsx
import { PulseTrezor } from "pulse-trezor-desk"; // or relative src

<PulseTrezor />                 // mainnet PulseChain
<PulseTrezor showTestnet />     // lab: testnet toggle
<PulseTrezor rpc="https://your-node.example" />  // host-forced RPC
```

Standalone `npm run dev` shell uses testnet + toggle (`src/App.tsx`).

Also exported: Connect helpers + `sendPlsWithTrezor` + `RpcOverride` from `src/index.ts`.

## Maintainer docs

- [PRIORITY.md](./PRIORITY.md) · [TODO.md](./TODO.md) · [AGENTS.md](./AGENTS.md)
- [ACCEPTANCE.md](./ACCEPTANCE.md) · [TESTING.md](./TESTING.md) · [END-TO-END.md](./END-TO-END.md)
- [HELPFUL-NOTES.md](./HELPFUL-NOTES.md) · [ADOPTION.md](./ADOPTION.md)

## Status

**Gate 1 preview** — Connect · balances · send · approve · Sites (WC) · watch/SYNC · MV3 lab extension. Needs Trezor Suite (Connect 10). Free Reown project id for WalletConnect. Device smokes: `tests/smoke/`.
