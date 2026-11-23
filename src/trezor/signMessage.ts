/**
 * ethereumSignMessage / ethereumSignTypedData via Connect 10 → Suite → device.
 */
import type { Hex } from "viem";
import {
  TrezorConnect,
  ensureTrezorInit,
  humanTrezorError,
  resetTrezorInit,
} from "./connect";
import { ethAddressPath } from "./paths";

function failMsg(res: unknown): string {
  const fail = res as {
    payload?: { error?: string };
    error?: { message?: string } | string;
  };
  return (
    fail.payload?.error ||
    (typeof fail.error === "string" ? fail.error : fail.error?.message) ||
    "Trezor sign failed"
  );
}

function asSig(payload: unknown): Hex {
  const p = payload as { signature?: string };
  if (!p?.signature) throw new Error("Trezor returned no signature.");
  return (
    p.signature.startsWith("0x") ? p.signature : `0x${p.signature}`
  ) as Hex;
}

async function withInitRetry<T extends { success: boolean }>(
  run: () => Promise<T>,
): Promise<T> {
  let res = await run();
  if (!res.success && /not initialized/i.test(failMsg(res))) {
    resetTrezorInit();
    res = await run();
  }
  return res;
}

export async function signPersonalMessage(
  message: string,
  derivationIndex: number,
): Promise<Hex> {
  const path = ethAddressPath(derivationIndex);
  const res = await withInitRetry(async () => {
    await ensureTrezorInit();
    return TrezorConnect.ethereumSignMessage({
      path,
      message,
      hex: false,
    });
  });
  if (!res.success) {
    throw new Error(humanTrezorError(failMsg(res)));
  }
  return asSig(res.payload);
}

/** EIP-712 typed data as wallets pass it (domain / types / primaryType / message). */
export type Eip712TypedData = {
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
};

/** WC / EIP-1193: `[address, data]` or `[data]` (stringified JSON ok). */
export function parseTypedDataParams(params: unknown): {
  address?: string;
  data: Eip712TypedData;
} {
  const arr = Array.isArray(params) ? params : [params];
  let address: string | undefined;
  let raw: unknown = arr[0];
  if (
    typeof arr[0] === "string" &&
    arr[0].startsWith("0x") &&
    arr[0].length === 42 &&
    arr.length >= 2
  ) {
    address = arr[0];
    raw = arr[1];
  } else if (typeof arr[1] === "string" && arr[1].startsWith("0x") && arr[1].length === 42) {
    // rare order: data, address
    address = arr[1];
    raw = arr[0];
  }
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new Error("Typed data is not valid JSON");
    }
  }
  const data = raw as Eip712TypedData;
  if (!data?.types || !data.primaryType || !data.domain || !data.message) {
    throw new Error("Typed data missing types / primaryType / domain / message");
  }
  return { address, data };
}

export async function signTypedData(
  data: Eip712TypedData,
  derivationIndex: number,
): Promise<Hex> {
  const path = ethAddressPath(derivationIndex);
  const res = await withInitRetry(async () => {
    await ensureTrezorInit();
    return TrezorConnect.ethereumSignTypedData({
      path,
      data: data as never,
      metamask_v4_compat: true,
    });
  });
  if (!res.success) {
    throw new Error(humanTrezorError(failMsg(res)));
  }
  return asSig(res.payload);
}
