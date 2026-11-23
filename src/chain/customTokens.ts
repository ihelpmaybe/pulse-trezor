/**
 * User-imported ERC-20s — local only, per chain. Testnet-friendly.
 */
import {
  erc20Abi,
  formatUnits,
  type Address,
} from "viem";
import {
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
} from "./client";

export type CustomToken = {
  chainId: DeskChainId;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
};

const KEY = "pulse-perch-custom-tokens-v1";

export function loadCustomTokens(chainId?: DeskChainId): CustomToken[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as CustomToken[];
    if (!Array.isArray(all)) return [];
    return chainId == null
      ? all
      : all.filter((t) => t.chainId === chainId);
  } catch {
    return [];
  }
}

export function saveCustomTokens(all: CustomToken[]) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function addCustomToken(token: CustomToken): CustomToken[] {
  const all = loadCustomTokens();
  const key = `${token.chainId}:${token.address.toLowerCase()}`;
  const next = [
    ...all.filter(
      (t) => `${t.chainId}:${t.address.toLowerCase()}` !== key,
    ),
    token,
  ];
  saveCustomTokens(next);
  return next.filter((t) => t.chainId === token.chainId);
}

export function removeCustomToken(
  chainId: DeskChainId,
  address: Address,
): CustomToken[] {
  const all = loadCustomTokens().filter(
    (t) =>
      !(
        t.chainId === chainId &&
        t.address.toLowerCase() === address.toLowerCase()
      ),
  );
  saveCustomTokens(all);
  return all.filter((t) => t.chainId === chainId);
}

export async function fetchCustomTokenMeta(
  chainId: DeskChainId,
  address: Address,
  rpc?: RpcOverride,
): Promise<Omit<CustomToken, "chainId">> {
  const client = makePublicClient(chainId, rpc);
  const [symbol, name, decimals] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address, abi: erc20Abi, functionName: "name" }),
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return {
    address,
    symbol: String(symbol).slice(0, 16),
    name: String(name).slice(0, 48),
    decimals: Number(decimals),
  };
}

export async function fetchCustomBalances(
  chainId: DeskChainId,
  owner: Address,
  tokens: CustomToken[],
  rpc?: RpcOverride,
): Promise<{ token: CustomToken; raw: bigint; formatted: string }[]> {
  if (!tokens.length) return [];
  const client = makePublicClient(chainId, rpc);
  return Promise.all(
    tokens.map(async (token) => {
      try {
        const raw = await client.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
        });
        return {
          token,
          raw,
          formatted: formatUnits(raw, token.decimals),
        };
      } catch {
        return { token, raw: 0n, formatted: "—" };
      }
    }),
  );
}
