import { useCallback, useEffect, useMemo, useState } from "react";
import type { WalletKitTypes } from "@reown/walletkit";
import { getSdkError } from "@walletconnect/utils";
import {
  type Address,
  type Hex,
  hexToString,
  isHex,
} from "viem";
import {
  clearSignMessage,
  clearSignTx,
  worstTone,
  type ClearLine,
  type TxLike,
} from "./clearSign";
import {
  TrezorConnect,
  ensureTrezorInit,
  humanTrezorError,
} from "../trezor/connect";
import { ethAddressPath } from "../trezor/paths";
import { sendPlsWithTrezor } from "../trezor/signPulseTx";
import {
  activeSessions,
  approveProposal,
  disconnectTopic,
  getWalletKit,
  initWalletKit,
  pairUri,
  rejectProposal,
} from "./walletKit";

const PROJECT_KEY = "pulse-desk-reown-project-id";

type PendingReq = {
  id: number;
  topic: string;
  method: string;
  params: unknown;
  dappUrl?: string;
  lines: ClearLine[];
};

type Props = {
  address: Address | null;
  derivationIndex: number;
  onError: (msg: string | null) => void;
};

function txFromParams(params: unknown): TxLike | null {
  if (!Array.isArray(params) || !params[0] || typeof params[0] !== "object") {
    return null;
  }
  return params[0] as TxLike;
}

function valueToHex(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "bigint") return `0x${v.toString(16)}`;
  if (typeof v === "number") return `0x${Math.floor(v).toString(16)}`;
  const s = String(v);
  if (s.startsWith("0x") || s.startsWith("0X")) return s;
  try {
    return `0x${BigInt(s).toString(16)}`;
  } catch {
    return s;
  }
}

async function signPersonalMessage(
  message: string,
  derivationIndex: number,
): Promise<Hex> {
  await ensureTrezorInit();
  const path = ethAddressPath(derivationIndex);
  const res = await TrezorConnect.ethereumSignMessage({
    path,
    message,
    hex: false,
  });
  if (!res.success) {
    const fail = res as unknown as {
      payload?: { error?: string };
      error?: { message?: string } | string;
    };
    const err =
      fail.payload?.error ||
      (typeof fail.error === "string" ? fail.error : fail.error?.message) ||
      "Trezor sign failed";
    throw new Error(humanTrezorError(String(err)));
  }
  const payload = res.payload as { signature?: string };
  if (!payload?.signature) throw new Error("Trezor returned no signature.");
  return (
    payload.signature.startsWith("0x")
      ? payload.signature
      : `0x${payload.signature}`
  ) as Hex;
}

export function WcPanel({ address, derivationIndex, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(() => {
    try {
      return (
        localStorage.getItem(PROJECT_KEY) ||
        (import.meta.env.VITE_REOWN_PROJECT_ID as string) ||
        ""
      );
    } catch {
      return (import.meta.env.VITE_REOWN_PROJECT_ID as string) || "";
    }
  });
  const [uri, setUri] = useState("");
  const [proposal, setProposal] =
    useState<WalletKitTypes.SessionProposal | null>(null);
  const [pending, setPending] = useState<PendingReq | null>(null);
  const [sessionsTick, setSessionsTick] = useState(0);
  const [wired, setWired] = useState(false);

  const sessions = useMemo(() => {
    void sessionsTick;
    return Object.values(activeSessions());
  }, [sessionsTick]);

  const wireKitEvents = useCallback(() => {
    const kit = getWalletKit();
    if (!kit || wired) return;

    kit.on("session_proposal", (p) => {
      setProposal(p);
      setInfo(`Session proposal from ${p.params.proposer.metadata.name}`);
    });

    kit.on("session_request", async (event) => {
      const { topic, params, id } = event;
      const method = params.request.method;
      const reqParams = params.request.params;
      const peer = kit.getActiveSessions()[topic]?.peer?.metadata;
      const dappUrl = peer?.url || peer?.name || "";

      if (method === "wallet_switchEthereumChain") {
        const chainId = (reqParams as { chainId?: string }[])?.[0]?.chainId;
        const ok =
          chainId === "0x171" || chainId === "369" || Number(chainId) === 369;
        if (ok) {
          await kit.respondSessionRequest({
            topic,
            response: { id, jsonrpc: "2.0", result: null },
          });
          setInfo("Confirmed PulseChain (369)");
        } else {
          await kit.respondSessionRequest({
            topic,
            response: {
              id,
              jsonrpc: "2.0",
              error: getSdkError("UNSUPPORTED_CHAINS"),
            },
          });
          onError("dApp asked for a non-Pulse chain — rejected");
        }
        return;
      }

      let lines: ClearLine[];
      if (
        method === "eth_sendTransaction" ||
        method === "eth_signTransaction"
      ) {
        const tx = txFromParams(reqParams);
        lines = clearSignTx({
          to: tx?.to,
          valueHex: valueToHex(tx?.value),
          data: tx?.data ? String(tx.data) : "0x",
          dappUrl,
          method,
        });
      } else {
        let preview = "";
        try {
          const p0 = Array.isArray(reqParams) ? reqParams[0] : reqParams;
          if (typeof p0 === "string") {
            preview =
              method === "personal_sign" && isHex(p0)
                ? hexToString(p0 as Hex)
                : p0;
          } else {
            preview = JSON.stringify(p0).slice(0, 400);
          }
        } catch {
          preview = String(reqParams).slice(0, 400);
        }
        lines = clearSignMessage({ method, dappUrl, preview });
      }

      setPending({
        id,
        topic,
        method,
        params: reqParams,
        dappUrl,
        lines,
      });
    });

    kit.on("session_delete", () => setSessionsTick((n) => n + 1));
    setWired(true);
  }, [onError, wired]);

  useEffect(() => {
    if (address && projectId.trim()) {
      void initWalletKit(projectId.trim())
        .then(() => wireKitEvents())
        .catch((e) =>
          onError(e instanceof Error ? e.message : String(e)),
        );
    }
  }, [address, projectId, wireKitEvents, onError]);

  function saveProjectId() {
    const id = projectId.trim();
    try {
      localStorage.setItem(PROJECT_KEY, id);
    } catch {
      /* ignore */
    }
    setInfo(id ? "Project id saved" : "Project id cleared");
  }

  async function onPair() {
    onError(null);
    setBusy(true);
    try {
      if (!address) throw new Error("Connect Trezor first");
      const id = projectId.trim();
      if (!id) throw new Error("Paste a free Reown Cloud project id first");
      await initWalletKit(id);
      wireKitEvents();
      await pairUri(uri);
      setInfo("Pairing… approve the session when it appears");
      setSessionsTick((n) => n + 1);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onApproveSession() {
    if (!proposal || !address) return;
    setBusy(true);
    onError(null);
    try {
      await approveProposal(proposal, address);
      setProposal(null);
      setInfo("Session approved — dApp can request signs");
      setSessionsTick((n) => n + 1);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRejectSession() {
    if (!proposal) return;
    setBusy(true);
    try {
      await rejectProposal(proposal);
      setProposal(null);
      setInfo("Session rejected");
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onApproveRequest() {
    if (!pending || !address) return;
    const kit = getWalletKit();
    if (!kit) return;
    setBusy(true);
    onError(null);
    try {
      const { method, params, topic, id } = pending;
      let result: unknown;

      if (method === "eth_sendTransaction") {
        const tx = txFromParams(params);
        if (!tx?.to) throw new Error("Missing tx.to");
        const hash = await sendPlsWithTrezor({
          chainId: 369,
          account: address,
          to: tx.to as Address,
          value: tx.value != null ? BigInt(valueToHex(tx.value) || "0x0") : 0n,
          data: (tx.data as Hex) || "0x",
          derivationIndex,
        });
        result = hash;
      } else if (method === "personal_sign" || method === "eth_sign") {
        const arr = params as string[];
        const msgHexOrText =
          method === "personal_sign" ? arr[0] : arr[1] || arr[0];
        let message = msgHexOrText;
        if (isHex(msgHexOrText)) {
          try {
            message = hexToString(msgHexOrText as Hex);
          } catch {
            message = msgHexOrText;
          }
        }
        result = await signPersonalMessage(message, derivationIndex);
      } else if (/signTypedData/i.test(method)) {
        throw new Error(
          "EIP-712 typed-data is next — reject for now or use a simple send/approve",
        );
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      await kit.respondSessionRequest({
        topic,
        response: { id, jsonrpc: "2.0", result },
      });
      setPending(null);
      setInfo(`Signed · ${method}`);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      try {
        await kit.respondSessionRequest({
          topic: pending.topic,
          response: {
            id: pending.id,
            jsonrpc: "2.0",
            error: getSdkError("USER_REJECTED"),
          },
        });
      } catch {
        /* ignore */
      }
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  async function onRejectRequest() {
    if (!pending) return;
    const kit = getWalletKit();
    setBusy(true);
    try {
      if (kit) {
        await kit.respondSessionRequest({
          topic: pending.topic,
          response: {
            id: pending.id,
            jsonrpc: "2.0",
            error: getSdkError("USER_REJECTED"),
          },
        });
      }
      setPending(null);
      setInfo("Request rejected");
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const pendingTone = pending ? worstTone(pending.lines) : "ok";

  return (
    <section className="card send wc-card">
      <h2>WalletConnect → Trezor</h2>
      <p className="muted">
        Let PulseX / Phiat / ProveX / Bridge ask this Desk to sign on your
        device. Needs a free{" "}
        <a
          className="link"
          href="https://cloud.reown.com"
          target="_blank"
          rel="noreferrer"
        >
          Reown project id
        </a>
        . PulseChain (369) only.
      </p>

      {!address ? (
        <p className="muted">Connect Trezor above first.</p>
      ) : (
        <>
          <label className="field">
            Reown project id
            <input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="cloud.reown.com project id"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <button type="button" className="btn ghost" onClick={saveProjectId}>
            Save id
          </button>

          <label className="field">
            Pair wc: URI
            <textarea
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="wc:…"
              spellCheck={false}
              rows={3}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || !projectId.trim() || !uri.trim()}
            onClick={() => void onPair()}
          >
            {busy ? "…" : "Pair"}
          </button>

          {sessions.length > 0 ? (
            <ul className="meta">
              {sessions.map((s) => (
                <li key={s.topic}>
                  {s.peer?.metadata?.name || s.topic.slice(0, 12)}{" "}
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() =>
                      void disconnectTopic(s.topic).then(() =>
                        setSessionsTick((n) => n + 1),
                      )
                    }
                  >
                    Drop
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {proposal ? (
            <div className={`clear-box ${"warn"}`}>
              <strong>{proposal.params.proposer.metadata.name}</strong>
              <p className="muted">{proposal.params.proposer.metadata.url}</p>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void onApproveSession()}
                >
                  Approve session
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void onRejectSession()}
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          {pending ? (
            <div className={`clear-box ${pendingTone}`}>
              <p>
                <strong>{pending.method}</strong>
              </p>
              <ul className="clear-list">
                {pending.lines.map((l, i) => (
                  <li key={i} className={l.tone}>
                    <span className="t">{l.title}</span>
                    <span className="d">{l.detail}</span>
                  </li>
                ))}
              </ul>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void onApproveRequest()}
                >
                  Sign on Trezor
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void onRejectRequest()}
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          {info ? <p className="muted ok">{info}</p> : null}
        </>
      )}
    </section>
  );
}
