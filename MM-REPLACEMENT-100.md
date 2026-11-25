# 100 things — total MetaMask replacement (Pulse)

**Scope:** Pulse Perch / PulseChain daily life. Not ETH L2s, Snaps, or fiat on-ramps.  
**Law:** bag / send / approve / swap / Sites / sign **without MetaMask**.  
**Board of truth** for product punch-list status (desk gates/smoke → [TODO.md](./TODO.md)).  
**Canvas:** `mm-replacement-100.canvas.tsx` (filterable). Updated 2026-11-24.

## Custody
1. [x] Show PLS balance from Pulse RPC
2. [x] Show core token balances (HEX, PLSX, INC, USDC…)
3. [x] Full bag / scanner-backed holdings view
4. [x] Receive: display address + copy
5. [x] Verify address on device screen
6. [x] Send PLS (prepare → sign → broadcast)
7. [x] Send ERC-20
8. [x] Fee estimate before sign
9. [x] Watch-only after disconnect
10. [x] Multi-account load (BIP44 Account #1…N)
11. [x] Switch active account from list
12. [x] Tx status after send (pending → confirmed) — face poll
13. [x] Activity / history feed on face — PulseScan v2 dense + infinite scroll 2026-11-23
14. [~] Speed-up / cancel stuck tx (replace-by-fee) — UI + ynatm ladder + Anvil lab PASS; device mempool proof OPEN
15. [x] Custom gas / tip / max fee controls — Send Advanced in **beats** on 369/943 (not gwei) 2026-11-22
16. [x] Nonce display + manual override (power)
17. [x] Passphrase / hidden wallet callouts
18. [x] Address book + warn new recipient + recent chips + Paste
19. [x] QR receive / QR pay (EIP-681 style)
20. [x] Export watch addresses (no keys) as JSON

## Tokens
21. [x] Core Pulse token pack (SYNC4)
22. [x] Approve amount + approve max
23. [x] Clear-sign spender on approve path
24. [x] Custom token import by address — local + `wallet_watchAsset` (junk rejected)
25. [x] Hide spam / zero-balance toggle
26. [x] Token watchlist / favorites
27. [x] Approval inventory (who can spend what) — Approvals tab Scan 2026-11-22
28. [x] Revoke approvals — per-row + bulk selected
29. [x] Permit / EIP-2612 clear-sign — warn in WC typed/Permit selector
30. [x] Detect bridged vs inherited lookalikes
31. [x] NFT / sparse collectible view (Pulse) — grid + empty actions + operators jump 2026-11-24
32. [x] Token price hint (optional, trusted feed) — DexScreener soft USD

## Sites
33. [x] WalletConnect / Reown peer as Pulse Perch
34. [x] Pair wc: URI from Sites tab
35. [x] Approve / reject session
36. [~] eth_sendTransaction via WC → Trezor — lab URI + Suite Grant up 2026-11-22; hash blocked (Confirm click / 0 PLS on 369)
37. [x] personal_sign via WC — live PASS 2026-11-22 (lab.pulseperch.dev pair + Suite); inject also PASS
38. [x] eth_signTypedData_v4 / EIP-712 — inject + WC wallet-path PASS 2026-11-22 (`SITES-WC-EIP712-2026-11-22.md`)
39. [x] wallet_switchEthereumChain → desk packs (369/943/…) — inject + WC 2026-11-24
40. [x] Show dapp origin before every sign
41. [x] Active sessions list + Drop
42. [x] Piteas WC session smoke (proven)
43. [x] PulseX IPFS WC pair smoke
44. [x] HEX site WC pair smoke — PASS session 2026-11-22 (`SITES-HEX-2026-11-22.md`)
45. [x] ProveX WC / connect smoke — PASS session 2026-11-22 (`SITES-PROVEX-2026-11-22.md`; origin lookalike ack)
46. [~] End-to-end WC sign on device — personal_sign + EIP-712 PASS 2026-11-22; eth_sendTransaction hash still soft / mainnet dust parked
47. [x] Injected provider (window.ethereum) — this-tab lab personal_sign + EIP-712 PASS 2026-11-22
48. [x] Browser extension shell — chain/accounts/sign/typed/dust/closed-desk + event fan-out; **`0.1.4`** offscreen desk bridge + session cache (`npm run ext:pack`); CWS listing later
49. [x] Deep link open-in-Perch from Pulse sites — `?uri=` / `web+pulseperch:` → Sites
50. [x] Concurrent multi-dapp sessions without clobber — proposal/request queues + live dual pair PASS 2026-11-22 (`wc-concurrent-sessions-lab.mjs`)
51. [x] Per-origin permissions (accounts / methods) — remember allow/deny origin + cue on proposal
52. [x] Reject malicious chain switch / fake RPC

## Network
53. [x] Pulse mainnet 369 default
54. [x] Testnet 943 lab toggle
55. [x] RPC picker + custom node
56. [x] RPC health status on face
57. [x] Explorer links (address + tx)
58. [x] Auto-failover RPC list
59. [x] Chain badge always says PulseChain (anti-phish)
60. [x] RPC latency hint for power users (block height dropped; interval in Settings)

## Security
61. [x] Hardware path only (Connect → Suite → device)
62. [x] No seed / key in logs or AI bridge
63. [x] WC clear-sign strip (graded warnings)
64. [x] Blind calldata extra confirm — WC ack gate + danger strip (2026-11-22)
65. [x] Simulate / dry-run before agent or risky WC tx — TxExplain + WC Dry-run estimateGas
66. [x] Agent policy allow-list + hard gate
67. [x] Phishing domain warn on WC peer
68. [x] Firmware outdated warning
69. [x] Suite-down / cancel-on-device honest errors — cancel + Suite-quit PASS 2026-11-23
70. [x] Pen report before Gate 1 ship — template in tests/pen/REPORT.md (cancel + Suite-quit PASS)

## Pulse apps
71. [x] Sites path works without MetaMask installed — Apps empty teach + WC host
72. [x] PulseX swap via Sites (not only in-face) — ipfs + Pair in Apps on Swap tab
73. [x] Optional in-face PulseX convenience swap
74. [x] Slippage / deadline controls for swaps
75. [x] ProveX entry + USDC awareness
76. [x] Bridge deep-link / first-run receive after bridge
77. [x] HEX stake / end clear-sign companion — stakeStart hearts/days + stakeEnd index/id + Stakes tab 2026-11-22
78. [x] Liquid Loans / Phiat / Sino deep-links pack — Apps tab DeFi cards
79. [x] Footer core apps always one click away
80. [x] Migrate-from-ETH wizard entry

## UX
81. [x] Product name Pulse Perch on face + WC
82. [x] Settings: RPC + display prefs
83. [x] Silent a11y: live regions, focus trap, labels
84. [x] Softer first-run: detect Suite Desktop vs Web
85. [x] Clear Allow-in-Suite coaching (other monitor) — suite-allow callout 2026-11-24
86. [x] Onboarding: connect → bag → first Sites pair — FirstRunStrip + empty teaches 2026-11-24
87. [x] Empty states that teach next click
88. [~] Locale strings (EN first, then more) — en.ts expanded + wired face 2026-11-24; other langs later
89. [x] Light theme option (display)
90. [ ] NVDA / VoiceOver manual acceptance pass

## Ship
91. [x] Web / Vite desk usable today
92. [x] PWA installable (zero-friction try) — manifest + icon + SW shell
93. [~] Windows desktop pack — `desk:pack` web zip+sha (Electron/Tauri later)
94. [ ] Linux pack
95. [ ] macOS pack + notarize
96. [ ] Mobile companion path (Tip link / shared pack)
97. [~] Versioned updates channel — stub `docs/UPDATE-CHANNEL.md` (no auto-updater yet)
98. [~] Smoke + a11y evidence in CI / tests/smoke
99. [~] Gate 1 acceptance: bag/Sites/approve UI w/o MM PASS 2026-11-23 (`GATE-1-2026-11-23.md`); send/sign from prior smokes; mainnet WC spend still soft
100. [x] Public “uninstall MetaMask for Pulse” guide

## Out of scope (by design)
Multi-chain ETH/L2 portfolio, Snaps store, fiat buy, ENS-as-identity product, bridging *as* the wallet’s main job (Bridge is a site).
