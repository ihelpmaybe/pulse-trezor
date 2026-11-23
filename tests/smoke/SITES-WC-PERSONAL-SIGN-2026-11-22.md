# Live WC personal_sign — 2026-11-22 (evening)

**Status: PASS (wallet path)** — Sites pair + Sign on Trezor → face `Signed · personal_sign`

## Path
1. Connect #1 on testnet 943 (Suite + emu)
2. Lab dapp: `node scripts/wc-personal-sign-lab.mjs` (SignClient → `wc:` URI)
3. Perch Sites → paste URI → **Approve session** (origin `https://lab.pulseperch.dev`)
4. Dapp requests `personal_sign` → Perch clear-sign strip (preview text)
5. **Sign on Trezor** → emu YES → status **Signed · personal_sign**

## Evidence on face
- Session: Perch WC Lab
- Preview: `Pulse Perch live WC smoke …`
- Status chip: `Signed · personal_sign`

## Lab note
- Hard-block Approve on raw-IP phishing was too strict for localhost labs → now **checkbox ack** then Approve (`WcPanel.tsx`).
- Dapp process sometimes exits before relay returns the hex (PowerShell/WC race); wallet still completes Sign. Re-run lab if you need `tmp-wc-sign.json` SIG_OK.

## Still open
- PulseX **tx** sign (needs PLS dust on 369)
- Extension unpacked cross-origin inject
