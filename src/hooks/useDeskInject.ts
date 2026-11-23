/**
 * This-tab inject + MV3 perch-bridge postMessage host.
 * Signs stay Connect → Suite → device (dont-pretend).
 */
import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  hexToString,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";
import {
  isDeskChainId,
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";
import { addCustomToken } from "../chain/customTokens";
import { sendPlsWithTrezor } from "../trezor/signPulseTx";
import {
  parseTypedDataParams,
  signPersonalMessage,
  signTypedData,
} from "../trezor/signMessage";
import {
  bootAiPolicy,
  registerAgentHandlers,
  type AgentTxDraft,
} from "../ai/hooks";
import {
  PulsePerchProvider,
  attachInjectedProvider,
  detachInjectedProvider,
  getInjectedProvider,
  type InjectedHost,
} from "../provider/eip1193";
import { loadInjectEth, type Session } from "../ui/deskStorage";

/** Fan provider events out to MV3 dapp tabs via perch-bridge. */
function broadcastProviderEvent(event: string, args: unknown[]) {
  try {
    window.postMessage(
      {
        source: "pulse-perch-page-bridge",
        type: "provider-event",
        event,
        args,
      },
      "*",
    );
  } catch {
    /* ignore */
  }
}

export function useDeskInject(opts: {
  session: Session | null;
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  setChainId: Dispatch<SetStateAction<DeskChainId>>;
  refreshBalances: (addr: Address, cid: DeskChainId) => void | Promise<void>;
}) {
  const { session, chainId, effectiveRpc, setChainId, refreshBalances } = opts;
  const [injectEth, setInjectEth] = useState(() => loadInjectEth());

  useEffect(() => {
    bootAiPolicy();
  }, []);

  /** Agent bridge only — human Send / WC stay ungated. */
  useEffect(() => {
    if (!session) {
      registerAgentHandlers({ sign: null, prepare: null });
      return;
    }
    const account = session.address;
    const derivationIndex = session.derivationIndex;
    registerAgentHandlers({
      sign: async (draft: AgentTxDraft) => {
        const value =
          typeof draft.value === "bigint"
            ? draft.value
            : BigInt(draft.value ?? 0);
        const broadcast = await sendPlsWithTrezor({
          chainId: draft.chainId ?? chainId,
          account,
          to: draft.to,
          value,
          data: draft.data,
          derivationIndex,
          rpc: draft.rpc ?? effectiveRpc,
        });
        return broadcast.hash;
      },
      prepare: async (draft: AgentTxDraft) => {
        const value =
          typeof draft.value === "bigint"
            ? draft.value.toString()
            : String(draft.value ?? "0");
        return {
          chainId: draft.chainId ?? chainId,
          to: draft.to,
          value,
          data: draft.data,
          note: `Prepared for ${account} — unsigned. Sign only via requestSign if policy allows.`,
        };
      },
    });
    return () => registerAgentHandlers({ sign: null, prepare: null });
  }, [session, chainId, effectiveRpc]);

  /**
   * Extension content script is isolated — relay via postMessage
   * from perch-bridge.js (pulse-perch-ext-bridge).
   */
  useEffect(() => {
    const onBridgeMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.source !== "pulse-perch-ext-bridge") return;
      if (data.type === "ping") {
        const inject = (
          window as Window & { __pulsePerchInject?: { request?: unknown } }
        ).__pulsePerchInject;
        window.postMessage(
          {
            source: "pulse-perch-page-bridge",
            type: "pong",
            id: data.id,
            ready: typeof inject?.request === "function",
          },
          "*",
        );
        return;
      }
      if (data.type !== "request") return;
      void (async () => {
        const inject = (
          window as Window & {
            __pulsePerchInject?: {
              request: (args: {
                method: string;
                params?: unknown;
              }) => Promise<unknown>;
            };
          }
        ).__pulsePerchInject;
        if (!inject?.request) {
          window.postMessage(
            {
              source: "pulse-perch-page-bridge",
              type: "response",
              id: data.id,
              error: {
                code: 4100,
                message:
                  "Pulse Perch tab open but inject bridge not ready — connect Trezor",
              },
            },
            "*",
          );
          return;
        }
        try {
          const result = await inject.request({
            method: data.method,
            params: data.params,
          });
          window.postMessage(
            {
              source: "pulse-perch-page-bridge",
              type: "response",
              id: data.id,
              result,
            },
            "*",
          );
        } catch (e) {
          const err = e as { code?: number; message?: string };
          window.postMessage(
            {
              source: "pulse-perch-page-bridge",
              type: "response",
              id: data.id,
              error: {
                code: err?.code ?? 4200,
                message: err?.message || String(e),
              },
            },
            "*",
          );
        }
      })();
    };
    window.addEventListener("message", onBridgeMsg);
    return () => window.removeEventListener("message", onBridgeMsg);
  }, []);

  /** Host for this-tab inject + extension bridge (`window.__pulsePerchInject`). */
  useEffect(() => {
    const host: InjectedHost = {
      getSelectedAddress: () => session?.address ?? null,
      getChainId: () => chainId,
      switchChain: async (id) => {
        if (!isDeskChainId(id)) throw new Error(`Unsupported chain ${id}`);
        setChainId(id);
      },
      sendTransaction: async (tx) => {
        if (!session) throw new Error("Connect Trezor first");
        if (!tx.to || !isAddress(tx.to)) throw new Error("Invalid tx.to");
        const value =
          tx.value != null && String(tx.value) !== ""
            ? BigInt(tx.value as string)
            : 0n;
        const data = (tx.data as Hex | undefined) || "0x";
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: tx.to as Address,
          value,
          data,
          derivationIndex: session.derivationIndex,
          rpc: effectiveRpc,
        });
        return broadcast.hash;
      },
      personalSign: async (message) => {
        if (!session) throw new Error("Connect Trezor first");
        let text = message;
        if (isHex(message)) {
          try {
            text = hexToString(message as Hex);
          } catch {
            text = message;
          }
        }
        return signPersonalMessage(text, session.derivationIndex);
      },
      signTypedData: async (params) => {
        if (!session) throw new Error("Connect Trezor first");
        const { address, data } = parseTypedDataParams(params);
        if (
          address &&
          address.toLowerCase() !== session.address.toLowerCase()
        ) {
          throw new Error("Typed-data address mismatch");
        }
        return signTypedData(data, session.derivationIndex);
      },
      watchAsset: async (asset) => {
        if (!isDeskChainId(chainId)) return false;
        const addr = asset.options.address as Address;
        if (!isAddress(addr)) return false;
        const symbol = String(asset.options.symbol || "TOKEN").slice(0, 32);
        const decimals = Number(asset.options.decimals);
        addCustomToken({
          chainId,
          address: addr,
          symbol,
          name: symbol,
          decimals: Number.isFinite(decimals) ? decimals : 18,
        });
        const who = session?.address;
        if (who) void refreshBalances(who, chainId);
        return true;
      },
      readRpc: async (method, params) => {
        const client = makePublicClient(chainId, effectiveRpc);
        return client.request({
          method: method as "eth_blockNumber",
          params: params as never,
        });
      },
    };

    const w = window as Window & {
      __pulsePerchInject?: PulsePerchProvider;
    };
    if (w.__pulsePerchInject) {
      w.__pulsePerchInject.setHost(host);
    } else {
      w.__pulsePerchInject = new PulsePerchProvider(host);
    }
    const accounts = session?.address ? [session.address] : [];
    w.__pulsePerchInject.notifyAccountsChanged(accounts);
    w.__pulsePerchInject.notifyChainChanged(chainId);
    broadcastProviderEvent("accountsChanged", [accounts]);
    broadcastProviderEvent("chainChanged", [
      `0x${chainId.toString(16)}`,
    ]);

    if (injectEth) {
      const existing = getInjectedProvider();
      if (existing) {
        existing.setHost(host);
      } else {
        attachInjectedProvider(host);
      }
      getInjectedProvider()?.notifyAccountsChanged(accounts);
      getInjectedProvider()?.notifyChainChanged(chainId);
    } else {
      detachInjectedProvider();
    }
  }, [injectEth, session, chainId, effectiveRpc, refreshBalances, setChainId]);

  return { injectEth, setInjectEth };
}
