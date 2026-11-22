/**
 * Sign + broadcast PLS on PulseChain with Trezor Connect (real Bridge path).
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
import { makePublicClient, type DeskChainId, viemChain } from "../chain/client";

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

export type SendPlsArgs = {
  chainId: DeskChainId;
  account: Address;
  to: Address;
  value: bigint;
  data?: Hex;
  derivationIndex?: number;
};

export type FeePreview = {
  gas: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  eip1559: boolean;
};

export async function previewFees(
  chainId: DeskChainId,
  account: Address,
  to: Address,
  value: bigint,
  data: Hex = "0x",
): Promise<FeePreview> {
  const client = makePublicClient(chainId);
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

/** Prepare fees, sign on Trezor, broadcast. Call from a click after amount/to set. */
export async function sendPlsWithTrezor(args: SendPlsArgs): Promise<Hash> {
  await ensureTrezorInit();
  if (!isTrezorInited()) {
    throw new Error(
      "Trezor Connect still starting — wait a second, then click again.",
    );
  }

  const index = args.derivationIndex ?? 0;
  const path = ethAddressPath(index);
  const client = makePublicClient(args.chainId);
  const chain = viemChain(args.chainId);
  const data = (args.data ?? "0x") as Hex;

  const nonce = await client.getTransactionCount({
    address: args.account,
    blockTag: "pending",
  });

  const preview = await previewFees(
    args.chainId,
    args.account,
    args.to,
    args.value,
    data,
  );

  const trezorTx: Record<string, unknown> = {
    to: args.to,
    value: toHexQuantity(args.value),
    data,
    chainId: chain.id,
    nonce: toHexQuantity(BigInt(nonce)),
    gasLimit: toHexQuantity(preview.gas),
  };

  if (preview.eip1559) {
    trezorTx.maxFeePerGas = toHexQuantity(preview.maxFeePerGas!);
    trezorTx.maxPriorityFeePerGas = toHexQuantity(
      preview.maxPriorityFeePerGas!,
    );
  } else {
    trezorTx.gasPrice = toHexQuantity(preview.gasPrice!);
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

  const serialized = preview.eip1559
    ? serializeTransaction(
        {
          chainId: chain.id,
          nonce,
          to: args.to,
          value: args.value,
          data,
          gas: preview.gas,
          maxFeePerGas: preview.maxFeePerGas!,
          maxPriorityFeePerGas: preview.maxPriorityFeePerGas!,
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
          gas: preview.gas,
          gasPrice: preview.gasPrice!,
          type: "legacy",
        },
        sig,
      );

  return client.sendRawTransaction({ serializedTransaction: serialized });
}
