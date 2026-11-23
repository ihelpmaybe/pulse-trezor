# 100 things — total MetaMask replacement (Pulse)

**Scope:** Pulse Perch / PulseChain daily life. Not ETH L2s, Snaps, or fiat on-ramps.  
**Law:** bag / send / approve / swap / Sites / sign **without MetaMask**.  
**Canvas:** `mm-replacement-100.canvas.tsx` (filterable). Updated 2026-11-22.

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
12. [~] Tx status after send (pending → confirmed) — face poll 2026-11-22; full history still #13
13. [~] Activity / history feed on face — PulseScan v2 (369+943) compact card 2026-11-22
14. [~] Speed-up / cancel stuck tx (replace-by-fee) — Send face pending/timeout 2026-11-22
15. [x] Custom gas / tip / max fee controls — Send Advanced in **beats** on 369/943 (not gwei) 2026-11-22
16. [x] Nonce display + manual override (power)
17. [x] Passphrase / hidden wallet callouts
18. [x] Address book + warn new recipient + recent chips + Paste
19. [x] QR receive / QR pay (EIP-681 style)
20. [x] Export watch addresses (no keys) as JSON

## Tokens
21. [x] Core Pulse token pack (SYNC4)
22. [x] Approve amount + approve max
23. [~] Clear-sign spender on approve path
24. [x] Custom token import by address — local + `wallet_watchAsset` (junk rejected)
25. [x] Hide spam / zero-balance toggle
26. [x] Token watchlist / favorites
27. [~] Approval inventory (who can spend what) — Approvals tab Scan 2026-11-22
28. [x] Revoke approvals — per-row + bulk selected
29. [~] Permit / EIP-2612 clear-sign — warn in WC typed/Permit selector
30. [x] Detect bridged vs inherited lookalikes
31. [~] NFT / sparse collectible view (Pulse) — tabs + operator revoke
32. [x] Token price hint (optional, trusted feed) — DexScreener soft USD

## Sites
33. [x] WalletConnect / Reown peer as Pulse Perch
34. [x] Pair wc: URI from Sites tab
35. [x] Approve / reject session
36. [~] eth_sendTransaction via WC → Trezor — lab URI + Suite Grant up 2026-11-22; hash blocked (Confirm click / 0 PLS on 369)
37. [x] personal_sign via WC — live PASS 2026-11-22 (lab.pulseperch.dev pair + Suite); inject also PASS
38. [~] eth_signTypedData_v4 / EIP-712 — wired WC+inject; inject smoke PASS 2026-11-22
39. [~] wallet_switchEthereumChain → 369
40. [x] Show dapp origin before every sign
41. [x] Active sessions list + Drop
42. [x] Piteas WC session smoke (proven)
43. [x] PulseX IPFS WC pair smoke
44. [ ] HEX site WC pair smoke
45. [ ] ProveX WC / connect smoke
46. [ ] End-to-end WC sign confirmed on device (blocked: 0 PLS on #1)
47. [x] Injected provider (window.ethereum) — this-tab lab personal_sign + EIP-712 PASS 2026-11-22
48. [~] Browser extension shell — MV3 lab under `extension/` (load unpacked); CDP smoke deferred; not store-ready
49. [x] Deep link open-in-Perch from Pulse sites — `?uri=` / `web+pulseperch:` → Sites
50. [ ] Concurrent multi-dapp sessions without clobber
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
69. [~] Suite-down / cancel-on-device honest errors
70. [~] Pen report before Gate 1 ship — template in tests/pen/REPORT.md

## Pulse apps
71. [~] Sites path works without MetaMask installed
72. [~] PulseX swap via Sites (not only in-face) — ipfs link on Swap tab
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
85. [~] Clear Allow-in-Suite coaching (other monitor)
86. [~] Onboarding: connect → bag → first Sites pair — face cue + empty teaches
87. [x] Empty states that teach next click
88. [~] Locale strings (EN first, then more) — en.ts map started
89. [x] Light theme option (display)
90. [ ] NVDA / VoiceOver manual acceptance pass

## Ship
91. [x] Web / Vite desk usable today
92. [x] PWA installable (zero-friction try) — manifest + icon + SW shell
93. [ ] Windows desktop pack (Electron/Tauri later)
94. [ ] Linux pack
95. [ ] macOS pack + notarize
96. [ ] Mobile companion path (Tip link / shared pack)
97. [~] Versioned updates channel — stub `docs/UPDATE-CHANNEL.md` (no auto-updater yet)
98. [~] Smoke + a11y evidence in CI / tests/smoke
99. [ ] Gate 1 acceptance: bag/send/approve/Sites/sign w/o MM
100. [x] Public “uninstall MetaMask for Pulse” guide

## Out of scope (by design)
Multi-chain ETH/L2 portfolio, Snaps store, fiat buy, ENS-as-identity product, bridging *as* the wallet’s main job (Bridge is a site).
