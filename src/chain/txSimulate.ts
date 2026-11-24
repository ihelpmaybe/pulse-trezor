/**
 * Confirm-face tx simulate — Temper when reachable, else one-shot eth_call + gas.
 * Balance-change face via simBalance (Rabby-ish Transfer/Approval lines).
 * Not a live portfolio poller.
 */
import type { Address, Hex } from "viem";
import {
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
} from "./client";
import {
  temperSimulate,
  toTemperRequest,
  type TemperSimulateResponse,
} from "./temperClient";
import {
  deltasFromCalldata,
  deltasFromLogs,
  linesFromDeltas,
  type BalanceDelta,
} from "./simBalance";

export type SimTone = "ok" | "warn" | "danger";

export type TxSimResult = {
  ok: boolean;
  tone: SimTone;
  /** Short face line. */
  detail: string;
  source: "temper" | "rpc";
  gas?: bigint;
  exitReason?: string;
  /** ERC-20 / native / Approval hints. */
  balanceHints: string[];
  /** Structured deltas for UI list. */
  deltas: BalanceDelta[];
};

/**
 * One click: Temper (if up) else RPC eth_call + estimateGas.
 * Never loops / never polls.
 */
export async function simulateDeskTx(opts: {
  chainId: DeskChainId;
  from: Address;
  to: Address;
  data?: Hex | string;
  valueWei?: bigint;
  rpc?: RpcOverride;
}): Promise<TxSimResult> {
  const data = (opts.data?.trim() || "0x") as Hex;
  const value = opts.valueWei ?? 0n;
  const priorDeltas = deltasFromCalldata({
    chainId: opts.chainId,
    from: opts.from,
    to: opts.to,
    data,
    valueWei: value,
  });

  const temper = await temperSimulate(
    toTemperRequest({
      chainId: opts.chainId,
      from: opts.from,
      to: opts.to,
      data,
      valueWei: value,
    }),
  );
  if (temper) {
    return fromTemper(temper, priorDeltas, opts.from);
  }

  return fromRpc({
    chainId: opts.chainId,
    from: opts.from,
    to: opts.to,
    data,
    value,
    rpc: opts.rpc,
    priorDeltas,
  });
}

function fromTemper(
  temper: TemperSimulateResponse,
  prior: BalanceDelta[],
  viewer: Address,
): TxSimResult {
  const logDeltas = deltasFromLogs(temper.logs, viewer);
  const deltas = [...prior, ...logDeltas];
  const balanceHints = linesFromDeltas(deltas);
  const gas =
    typeof temper.gasUsed === "number" ? BigInt(temper.gasUsed) : undefined;
  if (temper.success) {
    return {
      ok: true,
      tone: deltas.some((d) => d.kind === "approve") ? "warn" : "ok",
      source: "temper",
      gas,
      exitReason: temper.exitReason,
      balanceHints,
      deltas,
      detail: [
        "Temper OK",
        gas != null ? `gas ${gas.toString()}` : null,
        temper.exitReason || null,
        balanceHints[0] || null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  return {
    ok: false,
    tone: "danger",
    source: "temper",
    gas,
    exitReason: temper.exitReason,
    balanceHints,
    deltas,
    detail: [
      "Temper REVERT",
      temper.exitReason || null,
      gas != null ? `gas ${gas.toString()}` : null,
      "Do not sign unless you understand why",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

async function fromRpc(opts: {
  chainId: DeskChainId;
  from: Address;
  to: Address;
  data: Hex;
  value: bigint;
  rpc?: RpcOverride;
  priorDeltas: BalanceDelta[];
}): Promise<TxSimResult> {
  const balanceHints = linesFromDeltas(opts.priorDeltas);
  const client = makePublicClient(opts.chainId, opts.rpc);
  let gas: bigint | undefined;
  try {
    gas = await client.estimateGas({
      account: opts.from,
      to: opts.to,
      value: opts.value,
      data: opts.data,
    });
  } catch (e) {
    return {
      ok: false,
      tone: "danger",
      source: "rpc",
      balanceHints,
      deltas: opts.priorDeltas,
      detail: `Dry-run failed — ${e instanceof Error ? e.message : String(e)}. Do not sign unless you understand why.`,
    };
  }

  try {
    await client.call({
      account: opts.from,
      to: opts.to,
      value: opts.value,
      data: opts.data,
    });
  } catch (e) {
    return {
      ok: false,
      tone: "danger",
      source: "rpc",
      gas,
      balanceHints,
      deltas: opts.priorDeltas,
      detail: `eth_call revert — ${e instanceof Error ? e.message : String(e)}. Gas est ${gas.toString()}.`,
    };
  }

  return {
    ok: true,
    tone: opts.priorDeltas.length ? "warn" : "ok",
    source: "rpc",
    gas,
    balanceHints,
    deltas: opts.priorDeltas,
    detail: [
      "RPC dry-run OK",
      `estimateGas ${gas.toString()}`,
      "(Temper offline — start local Temper or set VITE_TEMPER_URL for traces)",
      balanceHints[0] || null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/** Agent bridge shape. */
export async function simulateForAgent(draft: {
  chainId?: number;
  to: Address;
  value?: bigint | string;
  data?: Hex;
  from: Address;
  rpc?: RpcOverride;
}): Promise<{ ok: boolean; detail: string }> {
  const chainId = (draft.chainId ?? 369) as DeskChainId;
  const value =
    typeof draft.value === "bigint"
      ? draft.value
      : BigInt(draft.value ?? 0);
  const r = await simulateDeskTx({
    chainId,
    from: draft.from,
    to: draft.to,
    data: draft.data,
    valueWei: value,
    rpc: draft.rpc,
  });
  return { ok: r.ok, detail: r.detail };
}
