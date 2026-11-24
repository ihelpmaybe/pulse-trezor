# PulseChain ERC-7730 → official registry

**Status:** local truth in Perch (`src/wc/erc7730Resolve.ts`). This folder is the **upstream PR pack**.

## Submit
1. Clone `https://github.com/ethereum/clear-signing-erc7730-registry`
2. Copy this folder to `registry/pulsechain/` (one entity per PR)
3. Fix `$schema` relative path to `../../specs/erc7730-v2.schema.json` inside that repo
4. Expand `testsv2/` with real PulseScan rawTx fixtures (Sourcify-verified)
5. Run registry `erc7730 lint` locally
6. Open PR touching **only** `registry/pulsechain/`

## Also include (follow-up files)
- `calldata-WPLS.json` · `calldata-PLSX.json` · `calldata-USDC-Pulse.json`
- `calldata-PulseXRouterV1.json` (`0x98bf…cc02`)
- HEX stake/endStake entity once Sourcify ABI + tests exist

## Kill_if
Claiming “official registry” before the PR merges · inventing a non-7730 schema.
