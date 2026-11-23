/**
 * RPC health probe + override apply for the desk.
 */
import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Address } from "viem";
import {
  failoverRpc,
  packFor,
  resolveRpcUrl,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";
import {
  loadRpcHealthMs,
  loadRpcOverride,
  saveRpcOverride,
} from "../ui/deskStorage";
import type { Session } from "../ui/deskStorage";

export type RpcHealth =
  | { state: "checking" }
  | { state: "ok"; block: bigint; latencyMs: number; url: string }
  | { state: "down"; detail: string };

export function useDeskRpc(opts: {
  chainId: DeskChainId;
  /** Host-prop RPC from PulseTrezor props. */
  rpc: RpcOverride | undefined;
  active: Session | null;
  setErr: Dispatch<SetStateAction<string | null>>;
  refreshBalances: (addr: Address, cid: DeskChainId) => void | Promise<void>;
}) {
  const { chainId, rpc, active, setErr, refreshBalances } = opts;

  const [rpcDraft, setRpcDraft] = useState(() => loadRpcOverride());
  const [rpcSaved, setRpcSaved] = useState(() => loadRpcOverride());
  const [rpcHealthMs, setRpcHealthMs] = useState(() => loadRpcHealthMs());
  const [rpcCustomMode, setRpcCustomMode] = useState(false);
  const [rpcHealth, setRpcHealth] = useState<RpcHealth>({ state: "checking" });
  const [rpcFailoverUrl, setRpcFailoverUrl] = useState<string | null>(null);

  const pack = packFor(chainId);
  const effectiveRpc: RpcOverride | undefined =
    rpcSaved || rpc || rpcFailoverUrl || undefined;
  const activeRpcUrl = resolveRpcUrl(chainId, effectiveRpc);
  const defaultRpcUrl = pack.rpc[0];
  const rpcNorm = (u: string) => u.replace(/\/$/, "").toLowerCase();
  const rpcOptions: { name: string; url: string }[] =
    (
      pack as {
        rpcOptions?: { name: string; url: string }[];
      }
    ).rpcOptions?.length
      ? (pack as { rpcOptions: { name: string; url: string }[] }).rpcOptions
      : pack.rpc.map((url, i) => ({
          name: i === 0 ? "Official" : url,
          url,
        }));
  const rpcMatchesPreset = rpcOptions.some(
    (s) => rpcNorm(s.url) === rpcNorm(activeRpcUrl),
  );
  const rpcSelectValue =
    rpcCustomMode || !rpcMatchesPreset ? "__custom__" : activeRpcUrl;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let first = true;

    const tick = async () => {
      if (first && !cancelled) {
        setRpcHealth({ state: "checking" });
        first = false;
      }
      const forced = rpcSaved || rpc;
      const r = forced
        ? await failoverRpc(chainId, forced)
        : await failoverRpc(chainId);
      if (cancelled) return;
      if (r.ok) {
        if (!forced) setRpcFailoverUrl(r.url);
        setRpcHealth({
          state: "ok",
          block: r.block,
          latencyMs: r.latencyMs,
          url: r.url,
        });
      } else {
        setRpcHealth({ state: "down", detail: r.error });
      }
      if (!cancelled && rpcHealthMs > 0) {
        timer = window.setTimeout(() => {
          void tick();
        }, rpcHealthMs);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [chainId, rpcSaved, rpc, rpcHealthMs]);

  useEffect(() => {
    if (!rpcMatchesPreset && rpcSaved) setRpcCustomMode(true);
  }, [rpcMatchesPreset, rpcSaved]);

  function applyRpc(url: string, custom = false) {
    const next = url.trim();
    setRpcDraft(next);
    saveRpcOverride(next);
    setRpcSaved(next);
    setRpcCustomMode(custom);
    setErr(null);
    if (active) void refreshBalances(active.address, chainId);
  }

  function onSaveRpc() {
    applyRpc(rpcDraft, true);
  }

  return {
    pack,
    effectiveRpc,
    activeRpcUrl,
    defaultRpcUrl,
    rpcOptions,
    rpcSelectValue,
    rpcDraft,
    setRpcDraft,
    rpcSaved,
    rpcCustomMode,
    setRpcCustomMode,
    rpcHealthMs,
    setRpcHealthMs,
    rpcHealth,
    applyRpc,
    onSaveRpc,
  };
}
