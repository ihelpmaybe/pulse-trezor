/**
 * EN string map — first locale; swap later without hunting JSX.
 */
export const en = {
  connect: "Connect",
  send: "Send",
  swap: "Swap",
  approvals: "Approvals",
  apps: "Apps",
  receiveQr: "Receive QR / EIP-681",
  hideZeros: "Hide zero balances",
  lightTheme: "Light theme",
  exportWatch: "Export watch addresses (JSON)",
  importWatch: "Import watch JSON",
  noCollect:
    "We don’t collect your data. Keys stay on your Trezor — bag, send, approve, and Apps without MetaMask. lolz",
  pulseChain: "PulseChain",
  firstRunTitle: "First time here",
  firstRunConnect:
    "Connect — Start connection, then Allow in Suite (other screen OK)",
  firstRunBag: "Bag — balances show after you’re linked",
  firstRunApps: "Apps — pair a site when you need a dapp",
  openApps: "open Apps",
  suiteAllowTitle: "Allow in Trezor Suite",
  suiteAllowHint:
    "Perch cannot click Allow for you. Stuck? Stop waiting, bring Suite to the front, then Start connection again.",
  nftOperators: "NFT operators",
  pairInApps: "Pair in Apps",
  fullPulsex: "Full PulseX (ipfs)",
  migrateFromEth: "Migrate from ETH",
  tokens: "Tokens",
  nfts: "NFTs",
  activity: "Activity",
  stakes: "Stakes",
} as const;

export type EnKey = keyof typeof en;

export function t(key: EnKey): string {
  return en[key];
}
