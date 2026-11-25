# Security — Pulse Perch

## Report a problem

Prefer **GitHub Security Advisories** on [ihelpmaybe/pulse-trezor](https://github.com/ihelpmaybe/pulse-trezor) when available.  
Otherwise open a **private** maintainer channel or a carefully worded public issue **without** live exploit steps that drain users.

Do **not** DM random “Perch support” accounts. We do not cold-DM seed recovery.

## Threat model (short)

| Trust | Why |
|-------|-----|
| **Trezor screen** | Source of truth for address and sign payload |
| **Trezor Suite** | Official device host (Connect 10) |
| **This desk (browser)** | UI + clear-sign coach — can be phished or buggy; never enter a seed here |
| **dApps / WC sessions** | Hostile by default until you verify origin + device text |
| **RPCs / explorers** | Can lie or censor; prefer known endpoints |

## Hard product rules

1. **No seed-in-browser** — ever. No software-HD labeled as Trezor.
2. **Clear-sign** for Permit / unlimited approve / blind calldata — extra confirms before Suite.
3. **WalletConnect Verify** + kill-all sessions when something feels wrong.
4. **First mainnet send** asks for an explicit ack.
5. Extension **does not fake connected accounts** when the desk is cold.

## What we are not

- Not official SatoshiLabs / Trezor Pulse support.
- Not a custodian. Not a bank. Not a recovery service.
- Chrome Web Store / Play listing is **not** the ship goal for the lab extension.

## Evidence / pen

Recent pen notes: [tests/pen/REPORT-2026-11-23.md](./tests/pen/REPORT-2026-11-23.md) · threat watch: [docs/THREAT-WATCH-2026-11.md](./docs/THREAT-WATCH-2026-11.md).

## Dependency honesty

Connect, Suite, Reown, and public RPCs are third parties. Their outages or policy changes are outside this repo. Pin and review upgrades before Gate tags.
