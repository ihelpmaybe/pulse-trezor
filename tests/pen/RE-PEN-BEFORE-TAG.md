# Re-pen before release tag

**Not a new pen run.** Use this when cutting a desk tag / ship zip so Gate T pen age stays honest.

Last full desk pen: [REPORT.md](./REPORT.md) · dated **2026-11-23** (cancel + Suite-quit).  
Rule of thumb: re-hit the rows below if that date is **≥ 30 days** old, or after a big WC / Connect / inject change.

## Quick re-hit (same scope as REPORT.md)

- [ ] No seed in logs / localStorage / AI bridge — spot-check + `npm run fuzz`
- [ ] Watch JSON still rejects seed-like payloads
- [ ] WC phishing / origin warn still blocks Approve without ack
- [ ] Unknown `wallet_addEthereumChain` / switch still rejected
- [ ] Blind calldata still needs extra ack before Sign
- [ ] Approve / Permit clear-sign still shows spender
- [ ] Suite-down / cancel-on-device still honest (or re-run Suite-quit smoke)
- [ ] Extension / inject still cannot bypass Trezor
- [ ] Origin shown before every Sites sign
- [ ] Deep link `?uri=` / `web+pulseperch:` still lands on Sites (no silent sign)

## After re-hit

1. Copy findings into a new `REPORT-YYYY-MM-DD.md` (or refresh the table in `REPORT.md`).
2. Update the date line in `REPORT.md` Sign-off.
3. Do **not** mark FULL OS×device from this stub alone.

## Kill_if

Claiming “pen fresh” without ticking the rows or dating a new artifact.
