/**
 * Sign + broadcast PLS on PulseChain with Trezor Connect 10 (Suite Desktop / Suite Web).
 * Adapted from pulse-publish; paths = SYNC0 ethAddressPath.
 */
import {
  serializeTransaction,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import {
  TrezorConnect,
  ensureTrezorInit,
  humanTrezorError,
  isTrezorInited,
} from "./connect";
import { ethAddressPath } from "./paths";
import {
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
  viemChain,
} from "../chain/client";

function toHexQuantity(n: bigint): string {
  return `0x${n.toString(16)}`;
}

type TrezorSig = { v: string | number; r: string; s: string };

function normalizeSig(payload: unknown): { r: Hex; s: Hex; v: bigint } {
  const p = payload as TrezorSig;
  if (p?.r == null || p?.s == null || p?.v == null) {
    throw new Error("Trezor returned no signature.");
  }
  const r = (p.r.startsWith("0x") ? p.r : `0x${p.r}`) as Hex;
  const s = (p.s.startsWith("0x") ? p.s : `0x${p.s}`) as Hex;
  const v = typeof p.v === "number" ? BigInt(p.v) : BigInt(p.v);
  return { r, s, v };
}

export type FeeOverride = {
  /** Wei — if set, replaces preview maxFeePerGas / gasPrice. */
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  gas?: bigint;
};

export type SendPlsArgs = {
  chainId: DeskChainId;
  account: Address;
  to: Address;
  value: bigint;
  data?: Hex;
  derivationIndex?: number;
  /** Custom RPC (own node). Defaults to pack public RPC. */
  rpc?: RpcOverride;
  /** Optional manual fee / gas — empty means network preview. */
  fee?: FeeOverride;
  /** Force nonce (speed-up / cancel replace-by-fee). */
  nonce?: number;
};

export type FeePreview = {
  gas: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  eip1559: boolean;
};

export type BroadcastResult = {
  hash: Hash;
  nonce: number;
  to: Address;
  value: bigint;
  data: Hex;
  eip1559: boolean;
  gas: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
};

/** Bump fees ≥12.5% for RBF (percent, default 125 = 1.25×). */
export function bumpFees(
  meta: Pick<
    BroadcastResult,
    | "eip1559"
    | "maxFeePerGas"
    | "maxPriorityFeePerGas"
    | "gasPrice"
    | "gas"
  >,
  percent = 125n,
): FeeOverride {
  const scale = (n: bigint) => (n * percent) / 100n;
  if (meta.eip1559) {
    return {
      gas: meta.gas,
      maxFeePerGas: scale(meta.maxFeePerGas ?? 1n),
      maxPriorityFeePerGas: scale(meta.maxPriorityFeePerGas ?? 1n),
    };
  }
  return {
    gas: meta.gas,
    gasPrice: scale(meta.gasPrice ?? 1n),
  };
}

export async function previewFees(
  chainId: DeskChainId,
  account: Address,
  to: Address,
  value: bigint,
  data: Hex = "0x",
  rpc?: RpcOverride,
): Promise<FeePreview> {
  const client = makePublicClient(chainId, rpc);
  let gas: bigint;
  try {
    gas = await client.estimateGas({ account, to, value, data });
    gas = (gas * 12n) / 10n;
  } catch {
    gas = data === "0x" ? 21_000n : 100_000n;
  }
  const fees = await client.estimateFeesPerGas().catch(() => null);
  const legacyGasPrice =
    (await client.getGasPrice().catch(() => null)) ?? 1_000_000_000n;
  const eip1559 = fees?.maxFeePerGas != null && fees.maxFeePerGas > 0n;
  if (eip1559) {
    return {
      gas,
      eip1559: true,
      maxFeePerGas: fees!.maxFeePerGas!,
      maxPriorityFeePerGas:
        fees!.maxPriorityFeePerGas ?? fees!.maxFeePerGas! / 10n,
    };
  }
  return { gas, eip1559: false, gasPrice: legacyGasPrice };
}

/** Load a broadcast tx for speed-up / cancel (must still be pending). */
export async function loadBroadcastMeta(
  chainId: DeskChainId,
  hash: Hash,
  rpc?: RpcOverride,
): Promise<BroadcastResult | null> {
  const client = makePublicClient(chainId, rpc);
  const tx = await client.getTransaction({ hash }).catch(() => null);
  if (!tx || tx.blockNumber != null) return null;
  const eip1559 = tx.type === "eip1559" || tx.maxFeePerGas != null;
  return {
    hash,
    nonce: tx.nonce,
    to: (tx.to || "0x0000000000000000000000000000000000000000") as Address,
    value: tx.value,
    data: (tx.input || "0x") as Hex,
    eip1559,
    gas: tx.gas,
    maxFeePerGas: tx.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? undefined,
    gasPrice: tx.gasPrice ?? undefined,
  };
}

/** Prepare fees, sign on Trezor, broadcast. Call from a click after amount/to set. */
export async function sendPlsWithTrezor(
  args: SendPlsArgs,
): Promise<BroadcastResult> {
  await ensureTrezorInit();
  if (!isTrezorInited()) {
    throw new Error(
      "Trezor Connect still starting — wait a second, then click again.",
    );
  }

  const index = args.derivationIndex ?? 0;
  const path = ethAddressPath(index);
  const client = makePublicClient(args.chainId, args.rpc);
  const chain = viemChain(args.chainId);
  const data = (args.data ?? "0x") as Hex;

  const nonce =
    args.nonce ??
    (await client.getTransactionCount({
      address: args.account,
      blockTag: "pending",
    }));

  const preview = await previewFees(
    args.chainId,
    args.account,
    args.to,
    args.value,
    data,
    args.rpc,
  );
  const fee = args.fee;
  const gas = fee?.gas ?? preview.gas;
  const eip1559 = preview.eip1559;
  const maxFeePerGas = fee?.maxFeePerGas ?? preview.maxFeePerGas;
  const maxPriorityFeePerGas =
    fee?.maxPriorityFeePerGas ?? preview.maxPriorityFeePerGas;
  const gasPrice = fee?.gasPrice ?? preview.gasPrice;

  const trezorTx: Record<string, unknown> = {
    to: args.to,
    value: toHexQuantity(args.value),
    data,
    chainId: chain.id,
    nonce: toHexQuantity(BigInt(nonce)),
    gasLimit: toHexQuantity(gas),
  };

  if (eip1559) {
    trezorTx.maxFeePerGas = toHexQuantity(maxFeePerGas!);
    trezorTx.maxPriorityFeePerGas = toHexQuantity(maxPriorityFeePerGas!);
  } else {
    trezorTx.gasPrice = toHexQuantity(gasPrice!);
  }

  const signed = await TrezorConnect.ethereumSignTransaction({
    path,
    transaction: trezorTx as never,
  });

  if (!signed.success) {
    const fail = signed as unknown as {
      payload?: { error?: string };
      error?: { message?: string } | string;
    };
    const err =
      fail.payload?.error ||
      (typeof fail.error === "string" ? fail.error : fail.error?.message) ||
      "Trezor sign failed";
    throw new Error(humanTrezorError(String(err)));
  }

  const sig = normalizeSig(signed.payload);

  const serialized = eip1559
    ? serializeTransaction(
        {
          chainId: chain.id,
          nonce,
          to: args.to,
          value: args.value,
          data,
          gas,
          maxFeePerGas: maxFeePerGas!,
          maxPriorityFeePerGas: maxPriorityFeePerGas!,
          type: "eip1559",
        },
        sig,
      )
    : serializeTransaction(
        {
          chainId: chain.id,
          nonce,
          to: args.to,
          value: args.value,
          data,
          gas,
          gasPrice: gasPrice!,
          type: "legacy",
        },
        sig,
      );

  const hash = await client.sendRawTransaction({
    serializedTransaction: serialized,
  });

  return {
    hash,
    nonce,
    to: args.to,
    value: args.value,
    data,
    eip1559,
    gas,
    maxFeePerGas: eip1559 ? maxFeePerGas : undefined,
    maxPriorityFeePerGas: eip1559 ? maxPriorityFeePerGas : undefined,
    gasPrice: eip1559 ? undefined : gasPrice,
  };
}
