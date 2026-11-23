# EIP-712 inject smoke (2026-11-22)

**Status: PASS**

## Result
- `eth_signTypedData_v4` via `window.__pulsePerchInject`
- Domain: Pulse Perch / v1 / chainId 943
- Message: `{ contents: "EIP-712 inject smoke" }`
- Sig: `0x080d0a009f59532e78e27ff7766d7e000a6d199767e22b2bc803ab40a8657ac154d9a736b04312b748a0a797d70d21136635f489e1f3744e6a3f8493e7aebb5d1b`

## Path
Connect 10 → Suite “Sign EIP-712 typed data” → emu YES → inject host

## Also wired
- WC `eth_signTypedData*` → same `signTypedData`
- Unit: `parseTypedDataParams` + provider route
