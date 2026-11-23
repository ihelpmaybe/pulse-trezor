# Pulse Perch

**PulseChain MetaMask replacement** for a real Trezor — bag, send, approve, Sites (WalletConnect).  
Suite hosts the device; Perch is the Pulse UI.

> **Vibe coded, device-tested.** Built fast with AI pair-programming, then smoked on Connect → Suite → Trezor (testnet Gate 1). Rough edges exist. **The Trezor screen is truth** — the browser can lie.

**Start here → [TRY.md](./TRY.md)** · In-app **?** FAQ (next to the eye)

---

## Quick start

```bash
git clone https://github.com/ihelpmaybe/pulse-trezor.git
cd pulse-trezor
cp .env.example .env.local   # optional: VITE_REOWN_PROJECT_ID for Sites
npm run setup
npm run dev
```

Open **http://127.0.0.1:5174/** → unlock **Trezor Suite** → **Connect** → confirm address on device.

Lab default = **Pulse testnet 943**. Guides: [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides).

| Artifact | Link |
|----------|------|
| Try / install | [TRY.md](./TRY.md) |
| Extension sideload | [Releases `extension-0.1.1`](https://github.com/ihelpmaybe/pulse-trezor/releases/tag/extension-0.1.1) (+ SHA256) |
| Pen report | [tests/pen/REPORT-2026-11-23.md](./tests/pen/REPORT-2026-11-23.md) |
| Threat watch | [docs/THREAT-WATCH-2026-11.md](./docs/THREAT-WATCH-2026-11.md) |

---

## What works (Gate 1 preview)

- Connect Trezor · bag · send · approve / revoke · PulseX quote-swap  
- Sites (WC) with Verify + kill-all sessions · clear-sign (Permit / 712 / dead-end HEX block)  
- Watch / SYNC pair · modular HEX stakes · PWA install · FAQ  
- Lab MV3 extension (sideload; not Chrome Web Store yet)

**Not claiming yet:** mainnet WC spend with real dust · official Suite Pulse · phone HWW app.

**Not our product:** fake “official Suite for Pulse” · seed-in-browser · GoPulse promo.

---

## Sibling repos

| Repo | Role |
|------|------|
| [pulse-trezor](https://github.com/ihelpmaybe/pulse-trezor) | Desk (this repo) |
| [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides) | Normie guides |
| [pulse-trezor-platform](https://github.com/ihelpmaybe/pulse-trezor-platform) | Watch registry / badge packs |
| [pulse-trezor-suite](https://github.com/ihelpmaybe/pulse-trezor-suite) | Suite gap study |
| [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet) | Soft Android (separate lane) |

---

## Embed

```tsx
import { PulseTrezor } from "pulse-trezor-desk"; // or relative src

<PulseTrezor />                 // mainnet PulseChain
<PulseTrezor showTestnet />     // lab: testnet toggle
<PulseTrezor rpc="https://your-node.example" />
```

Also exported: Connect helpers + `sendPlsWithTrezor` + `RpcOverride` from `src/index.ts`.

---

## Modularity / layout

Prefer small modules under `src/ui/` and `src/chain/` / `src/wc/` over growing `PulseTrezor.tsx` further. Recent extracts: `FaqModal`, `CoreFooter`, `InstallPwa`, `SyncPair`, clear-sign / verify / dead-end recipients.

---

## Maintainer docs

[PRIORITY](./PRIORITY.md) · [TODO](./TODO.md) · [AGENTS](./AGENTS.md) · [ACCEPTANCE](./ACCEPTANCE.md) · [TESTING](./TESTING.md) · [scripts/README](./scripts/README.md)

---

## License / trademark

Not affiliated with SatoshiLabs / Trezor. “Trezor” is their mark. PulseChain / HEX / PulseX / ProveX belong to their respective projects.
