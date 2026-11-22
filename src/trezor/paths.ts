/**
 * SYNC0 / pqq-metamask-bip44-v1
 * m/44'/60'/0'/0/{index} — index 0 = Account 1
 */
export const SCHEME_ID = "pqq-metamask-bip44-v1" as const;

export function ethAddressPath(index = 0): string {
  const i = Math.max(0, Math.floor(index));
  return `m/44'/60'/0'/0/${i}`;
}
