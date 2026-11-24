/**
 * ethereumSignMessage / ethereumSignTypedData via Connect 10 → Suite → device.
 *
 * Typed data: official Connect 10 recipe (connect-plugin-ethereum deprecated) —
 * pass `data` + metamask_v4_compat + show_message_hash; Connect computes hashes.
 * Viem hash fallback only when Connect rejects (T1-style blind-sign path).
 */
import { hashDomain, hashStruct, type Hex } from "viem";
import {
  TrezorConnect,
  enqueueHw,
  ensureTrezorInit,
  messageFromTrezorPayload,
  resetTrezorInit,
} from "./connect";
import { ethAddressPath } from "./paths";

function failMsg(res: unknown): string {
  const fail = res as {
    payload?: { error?: string; code?: string };
    error?: { message?: string } | string;
  };
  if (fail.payload && (fail.payload.error || fail.payload.code)) {
    return messageFromTrezorPayload(fail.payload, "Trezor sign failed");
  }
  return (
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
  derivationPath?: string,
): Promise<Hex> {
  const path = derivationPath?.trim() || ethAddressPath(derivationIndex);
  const res = await withInitRetry(async () => {
    await ensureTrezorInit();
    return enqueueHw(() =>
      TrezorConnect.ethereumSignMessage({
        path,
        message,
        hex: false,
      }),
    );
  });
  if (!res.success) {
    throw new Error(failMsg(res));
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

/** Official Connect 10 typed-data params (+ optional T1 hash fallback). */
export function buildTypedDataConnectParams(
  data: Eip712TypedData,
  hashes?: { domain_separator_hash: Hex; message_hash: Hex } | null,
): {
  data: Eip712TypedData;
  metamask_v4_compat: true;
  show_message_hash: true;
  domain_separator_hash?: Hex;
  message_hash?: Hex;
} {
  return {
    data,
    metamask_v4_compat: true,
    // Official explorer: also show message hash on modern models.
    show_message_hash: true,
    ...(hashes?.domain_separator_hash && hashes.message_hash
      ? {
          domain_separator_hash: hashes.domain_separator_hash,
          message_hash: hashes.message_hash,
        }
      : {}),
  };
}

function tryTypedHashes(data: Eip712TypedData): {
  domain_separator_hash: Hex;
  message_hash: Hex;
} | null {
  try {
    const typesForMessage = { ...data.types };
    delete typesForMessage.EIP712Domain;
    return {
      domain_separator_hash: hashDomain({
        domain: data.domain,
        types: data.types,
      } as never) as Hex,
      message_hash: hashStruct({
        primaryType: data.primaryType,
        types: typesForMessage,
        data: data.message,
      } as never) as Hex,
    };
  } catch {
    return null;
  }
}

function needsHashFallback(err: string): boolean {
  return /domain_separator|message_hash|hash|T1B1|Model One|blind/i.test(err);
}

export async function signTypedData(
  data: Eip712TypedData,
  derivationIndex: number,
  derivationPath?: string,
): Promise<Hex> {
  const path = derivationPath?.trim() || ethAddressPath(derivationIndex);

  const run = (withHashes: boolean) =>
    withInitRetry(async () => {
      await ensureTrezorInit();
      const hashes = withHashes ? tryTypedHashes(data) : null;
      const params = buildTypedDataConnectParams(data, hashes);
      // Connect overloads: data-only vs hash path — cast keeps both recipes.
      return enqueueHw(() =>
        TrezorConnect.ethereumSignTypedData({
          path,
          ...params,
        } as never),
      );
    });

  // Official Connect 10: data only first (plugin deprecated).
  let res = await run(false);
  if (!res.success && needsHashFallback(failMsg(res))) {
    res = await run(true);
  }
  if (!res.success) {
    throw new Error(failMsg(res));
  }
  return asSig(res.payload);
}
