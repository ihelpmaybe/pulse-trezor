import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import { pulsechain, pulsechainV4 } from "viem/chains";
import rpcPack from "../pack/rpc.json";

export type DeskChainId = 369 | 943;

const packById = new Map(
  rpcPack.chains.map((c) => [c.chainId as DeskChainId, c]),
);

export function packFor(chainId: DeskChainId) {
  const p = packById.get(chainId);
  if (!p) throw new Error(`No pack for chain ${chainId}`);
  return p;
}

export function viemChain(chainId: DeskChainId): Chain {
  return chainId === 943 ? pulsechainV4 : pulsechain;
}

export function makePublicClient(chainId: DeskChainId): PublicClient {
  const pack = packFor(chainId);
  const url = pack.rpc[0];
  return createPublicClient({
    chain: viemChain(chainId),
    transport: http(url, { timeout: 60_000 }),
  });
}

export async function fetchPlsBalance(
  chainId: DeskChainId,
  address: Address,
): Promise<bigint> {
  return makePublicClient(chainId).getBalance({ address });
}

export function explorerAddressUrl(chainId: DeskChainId, address: string) {
  const explorers = packFor(chainId).explorers;
  const base = explorers?.[0]?.url ?? "https://scan.pulsechain.com";
  return `${base}/address/${address}`;
}

export function explorerTxUrl(chainId: DeskChainId, hash: string) {
  const explorers = packFor(chainId).explorers;
  const base = explorers?.[0]?.url ?? "https://scan.pulsechain.com";
  return `${base}/tx/${hash}`;
}
