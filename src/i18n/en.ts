/**
 * EN string map — first locale; swap later without hunting JSX.
 */
export const en = {
  connect: "Connect",
  send: "Send",
  swap: "Swap",
  sites: "Sites",
  approvals: "Approvals",
  apps: "Apps",
  receiveQr: "Receive QR / EIP-681",
  hideZeros: "Hide zero balances",
  lightTheme: "Light theme",
  exportWatch: "Export watch addresses (JSON)",
  importWatch: "Import watch JSON",
  noCollect:
    "We don’t collect your data. Keys stay on your Trezor — bag, send, approve, and Sites without MetaMask. lolz",
  pulseChain: "PulseChain",
} as const;

export type EnKey = keyof typeof en;

export function t(key: EnKey): string {
  return en[key];
}
