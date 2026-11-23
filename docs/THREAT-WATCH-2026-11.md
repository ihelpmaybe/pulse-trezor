# Threat watch — wallet drains (2026-11)

Defensive notes from public reports. Not an exploit guide.

## Hot patterns (now)

| Pattern | What users see | Perch stance |
|---------|----------------|--------------|
| **WC session → Permit / unlimited approve** | Fake airdrop dApp pairs WC, then asks Sign | Clear-sign Permit + UNLIMITED fields; danger ack; prefer revoke |
| **EIP-2612 Permit max value + max deadline** | “Just a signature” then later drain | Flag UNLIMITED / NEVER on 712 value/deadline |
| **Fake Trezor Suite / Connect hosts** | suiteconnect-trezor.com, trezor-connect.com, “update” emails | Phish strip; Suite link only suite.trezor.io; never seed in browser |
| **Address poison** | Dust lookalike in Activity | Poison mark + don’t copy as recipient |
| **UI / clipboard address swap** | Paste wrong dest | Device screen is truth; lookalike warn on Send |
| **EIP-7702 set-code** | New “authorization” typed data | Danger strip + ack |
| **Blind multicall / obfuscated calldata** | Vague “contract interaction” | Blind selector → extra confirm |

## Already strong on Perch

- Hardware path (keys stay on Trezor via Suite)
- Approve / Permit danger ack + spender decode
- Address book lookalike + activity poison
- Suite-down cancel honesty

## Next harden (not yet)

- WalletConnect **Verify** domain check on pair
- Session list + one-click kill all WC sessions
- Spender age / unknown-contract reputation (optional feed)
- Focused PEN report before mainnet money claim

## Sources (public)

- WalletConnect session-hijack cohort (OAK / onchainattack)
- USDC Permit phishing drains (DarkNavy, Scam Sniffer / Decrypt)
- Trezor phishing / fake Suite (trezor.io security posts, PhishDestroy)
- Address poison + UI poisoning (MetaMask help, OWASP web3, Bybit/Safe UI case)
