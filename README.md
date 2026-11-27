# Pulse Perch

**PulseChain MetaMask replacement** for a real Trezor — bag, send, approve, Sites (WalletConnect).  
Suite hosts the device; Perch is the Pulse UI.

> **Vibe coded, device-tested.** Built fast with AI pair-programming, then smoked on Connect → Suite → Trezor (testnet Gate 1). Rough edges exist. **The Trezor screen is truth** — the browser can lie.

**Wholesome defaults:** no phone-home telemetry · no seed in the browser · keys stay on the Trezor · clear-sign before Suite · local prefs only. Details → [PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md).

**Install (no coding) → [INSTALL.md](./INSTALL.md)** · Builders → [TRY.md](./TRY.md) · In-app **?** FAQ

---

## Install (everyone)

**Pages = showcase only.** Do not Connect on github.io.

1. Grab the Windows zip from [Releases](https://github.com/ihelpmaybe/pulse-trezor/releases) → unzip → **`Open-Pulse-Perch.cmd`** (opens localhost)
2. Unlock **Trezor Suite** → **Connect** in Perch → confirm the address on the device

Peek (no wallet): https://ihelpmaybe.github.io/pulse-trezor/ · Details: [INSTALL.md](./INSTALL.md).

## Quick start (builders)

```bash
git clone https://github.com/ihelpmaybe/pulse-trezor.git
cd pulse-trezor
cp .env.example .env.local   # optional: VITE_REOWN_PROJECT_ID for Sites
npm run setup
npm run dev
```

Open **http://127.0.0.1:5174/** · Lab default = **Pulse testnet 943**. Guides: [Suite + Connect](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/suite-connect.md) · [PLS on Trezor](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/pls-on-trezor.md) · [all guides](https://github.com/ihelpmaybe/pulse-trezor-guides).

| Artifact | Link |
|----------|------|
| Install | [INSTALL.md](./INSTALL.md) · [Releases](https://github.com/ihelpmaybe/pulse-trezor/releases) |
| Showcase peek (no Connect) | https://ihelpmaybe.github.io/pulse-trezor/ |
| Wallet | Releases zip → `Open-Pulse-Perch.cmd` · or `npm run dev` |
| Builder try | [TRY.md](./TRY.md) |
| Extension sideload | [TRY.md](./TRY.md) · `npm run ext:pack` → `dist-ext/` (**0.1.5**) |
| Pen report | [tests/pen/REPORT-2026-11-23.md](./tests/pen/REPORT-2026-11-23.md) |
| Threat watch | [docs/THREAT-WATCH-2026-11.md](./docs/THREAT-WATCH-2026-11.md) |

---

## What works (Gate 1 preview)

- Connect Trezor · bag · send (Instant tip clamp on 943) · approve / revoke · PulseX quote-swap  
- Sites (WC) with Verify + kill-all sessions · clear-sign (Permit / 712 / dead-end HEX block)  
- Chainlist / EIP-3085 add-chain (inject + WC) · Settings → Networks / Add EVM by ID  
- Watch / SYNC pair · modular HEX stakes · PWA when the browser offers it · in-app FAQ  
- Lab MV3 extension **0.1.5** (sideload; Chrome Web Store listing is not a goal)

**Not claiming yet:** mainnet WC spend with real dust · official Suite Pulse · phone HWW app · PulseX/HEX signed swaps on 943.

**Not our product:** fake “official Suite for Pulse” · seed-in-browser · GoPulse promo.

---

## Sibling repos

| Repo | Role |
|------|------|
| [pulse-trezor](https://github.com/ihelpmaybe/pulse-trezor) | Desk (this repo) |
| [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides) | End-user guides |
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

**Modular first** (see `.cursor/rules/modular-first.mdc`): new face → `src/ui/*Panel.tsx`, not more paste into `PulseTrezor.tsx`. Kernel wires state only.

Extracts: `DevicePanel`, `TopStrip`, `DeskTools`, `BagPanel`, `ApprovePanel`, `SendPanel`, `SwapPanel`, `ActivityPanel`, `AppsPanel`, `SettingsModal`, `FaqModal`, `CoreFooter`, `deskStorage`, …

---

## Maintainer docs

[PRIVACY](./PRIVACY.md) · [SECURITY](./SECURITY.md) · [PRIORITY](./PRIORITY.md) · [TODO](./TODO.md) · [AGENTS](./AGENTS.md) · [ACCEPTANCE](./ACCEPTANCE.md) · [TESTING](./TESTING.md) · [scripts/README](./scripts/README.md)

---

## License / trademark

**MIT** — see [LICENSE](./LICENSE). Not affiliated with SatoshiLabs / Trezor. “Trezor” is their mark. PulseChain / HEX / PulseX / ProveX belong to their respective projects.
