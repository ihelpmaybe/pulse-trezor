/**
 * ERC-721/1155 operator approvals (setApprovalForAll) — Perch-owned scan + revoke.
 */
import {
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";
import {
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
} from "./client";
import { fetchScanNfts } from "./portfolio";

const approvalForAllEvent = {
  type: "event",
  name: "ApprovalForAll",
  inputs: [
    { name: "owner", type: "address", indexed: true, internalType: "address" },
    {
      name: "operator",
      type: "address",
      indexed: true,
      internalType: "address",
    },
    { name: "approved", type: "bool", indexed: false, internalType: "bool" },
  ],
} as const;

const nftOpsAbi = [
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

export type NftApprovalRow = {
  collection: Address;
  collectionName: string;
  operator: Address;
};

const LOG_BLOCK_RANGE = 100_000n;
const LOG_LOOKBACK = 2_000_000n;

export function encodeSetApprovalForAll(
  operator: Address,
  approved: boolean,
): Hex {
  return encodeFunctionData({
    abi: nftOpsAbi,
    functionName: "setApprovalForAll",
    args: [operator, approved],
  });
}

export async function fetchNftApprovalInventory(
  chainId: DeskChainId,
  owner: Address,
  rpc?: RpcOverride,
): Promise<NftApprovalRow[]> {
  if (chainId !== 369 && chainId !== 943) return [];
  const { nfts } = await fetchScanNfts(chainId, owner, 48).catch(() => ({
    nfts: [] as { contract: Address; collection: string }[],
  }));
  const collections = new Map<string, { address: Address; name: string }>();
  for (const n of nfts) {
    collections.set(n.contract.toLowerCase(), {
      address: n.contract,
      name: n.collection || short(n.contract),
    });
  }
  if (!collections.size) return [];

  const client = makePublicClient(chainId, rpc);
  const tip = await client.getBlockNumber().catch(() => null);
  if (tip == null) return [];
  const fromBlock = tip > LOG_LOOKBACK ? tip - LOG_LOOKBACK : 0n;

  const pairMap = new Map<string, NftApprovalRow>();

  await Promise.all(
    [...collections.values()].map(async (col) => {
      try {
        const logs = await client.getLogs({
          address: col.address,
          event: approvalForAllEvent,
          args: { owner },
          fromBlock,
          toBlock: tip,
          blockRange: LOG_BLOCK_RANGE,
        });
        for (const log of logs) {
          const op = log.args.operator;
          if (!op || op === "0x0000000000000000000000000000000000000000") continue;
          const key = `${col.address.toLowerCase()}:${op.toLowerCase()}`;
          pairMap.set(key, {
            collection: col.address,
            collectionName: col.name,
            operator: op,
          });
        }
      } catch {
        /* skip collection */
      }
    }),
  );

  const rows: NftApprovalRow[] = [];
  const pairs = [...pairMap.values()];
  for (let i = 0; i < pairs.length; i += 12) {
    const slice = pairs.slice(i, i + 12);
    const settled = await Promise.all(
      slice.map(async (p) => {
        try {
          const ok = await client.readContract({
            address: p.collection,
            abi: nftOpsAbi,
            functionName: "isApprovedForAll",
            args: [owner, p.operator],
          });
          return ok ? p : null;
        } catch {
          return null;
        }
      }),
    );
    for (const hit of settled) {
      if (hit) rows.push(hit);
    }
  }
  return rows;
}

function short(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
