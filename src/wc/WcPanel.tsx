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
  dangerAckLabel,
  explainClearLines,
  needsDangerAck,
  phishingWarn,
  worstTone,
  type ClearLine,
  type TxLike,
} from "./clearSign";
import {
  parseTypedDataParams,
  signPersonalMessage,
  signTypedData,
} from "../trezor/signMessage";
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
import {
  chainLabel,
  isDeskChainId,
  makePublicClient,
  parseChainRef,
  type DeskChainId,
} from "../chain/client";
import { originAllowed, rememberOrigin } from "../chain/wcOrigins";

const PROJECT_KEY = "pulse-desk-reown-project-id";

type PendingReq = {
  id: number;
  topic: string;
  method: string;
  params: unknown;
  dappUrl?: string;
  lines: ClearLine[];
  chainId: DeskChainId;
};

type Props = {
  address: Address | null;
  derivationIndex: number;
  /** Active desk chain — used when dapp request omits eip155 chain. */
  chainId: DeskChainId;
  onSwitchChain?: (chainId: DeskChainId) => void;
  onError: (msg: string | null) => void;
  /** When true, no outer card chrome (for embedding in Sites tab). */
  embedded?: boolean;
  /** Pre-fill pair URI from deep link / ?uri= */
  initialUri?: string | null;
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

export function WcPanel({
  address,
  derivationIndex,
  chainId: activeChainId,
  onSwitchChain,
  onError,
  embedded = false,
  initialUri = null,
}: Props) {
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
  const [uri, setUri] = useState(() => (initialUri || "").trim());
  const [proposal, setProposal] =
    useState<WalletKitTypes.SessionProposal | null>(null);
  const [pending, setPending] = useState<PendingReq | null>(null);
  const [blindAck, setBlindAck] = useState(false);
  const [sessionsTick, setSessionsTick] = useState(0);
  const [wired, setWired] = useState(false);

  useEffect(() => {
    if (initialUri?.trim()) {
      setUri(initialUri.trim());
      setInfo("Deep link URI loaded — Pair site when ready.");
    }
  }, [initialUri]);

  const sessions = useMemo(() => {
    void sessionsTick;
    return Object.values(activeSessions());
  }, [sessionsTick]);

  useEffect(() => {
    setBlindAck(false);
  }, [pending?.id, pending?.topic]);

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
      const reqChain =
        parseChainRef(params.chainId) ?? activeChainId;

      if (
        method === "wallet_switchEthereumChain" ||
        method === "wallet_addEthereumChain"
      ) {
        const raw =
          (reqParams as { chainId?: string }[])?.[0]?.chainId ??
          (reqParams as { chainId?: string })?.chainId;
        const next = parseChainRef(raw);
        if (next && isDeskChainId(next) && method === "wallet_switchEthereumChain") {
          onSwitchChain?.(next);
          await kit.respondSessionRequest({
            topic,
            response: { id, jsonrpc: "2.0", result: null },
          });
          setInfo(`Switched to ${chainLabel(next)} (${next})`);
        } else {
          await kit.respondSessionRequest({
            topic,
            response: {
              id,
              jsonrpc: "2.0",
              error: getSdkError("UNSUPPORTED_CHAINS"),
            },
          });
          onError(
            method === "wallet_addEthereumChain"
              ? `Rejected add-chain ${raw ?? "?"} — Perch only uses known Pulse/EVM desk chains`
              : `dApp asked for unsupported chain ${raw ?? "?"} — rejected`,
          );
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
        lines = [
          {
            tone: "ok",
            title: "Chain",
            detail: `${chainLabel(reqChain)} (${reqChain})`,
          },
          ...lines,
        ];
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
        chainId: reqChain,
      });
    });

    kit.on("session_delete", () => setSessionsTick((n) => n + 1));
    setWired(true);
  }, [onError, onSwitchChain, activeChainId, wired]);

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
      rememberOrigin(proposal.params.proposer.metadata.url || "", true);
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
      rememberOrigin(proposal.params.proposer.metadata.url || "", false);
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
        const broadcast = await sendPlsWithTrezor({
          chainId: pending.chainId,
          account: address,
          to: tx.to as Address,
          value: tx.value != null ? BigInt(valueToHex(tx.value) || "0x0") : 0n,
          data: (tx.data as Hex) || "0x",
          derivationIndex,
        });
        result = broadcast.hash;
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
        const { data } = parseTypedDataParams(params);
        result = await signTypedData(data, derivationIndex);
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
  const [simHint, setSimHint] = useState<string | null>(null);

  async function onDryRun() {
    if (!pending || !address) return;
    if (
      pending.method !== "eth_sendTransaction" &&
      pending.method !== "eth_signTransaction"
    ) {
      setSimHint("Dry-run only applies to transactions.");
      return;
    }
    const tx = txFromParams(pending.params);
    if (!tx?.to) {
      setSimHint("Missing tx.to — cannot simulate.");
      return;
    }
    setSimHint("Simulating…");
    try {
      const client = makePublicClient(pending.chainId);
      const gas = await client.estimateGas({
        account: address,
        to: tx.to as Address,
        value: tx.value != null ? BigInt(valueToHex(tx.value) || "0x0") : 0n,
        data: (tx.data as Hex) || "0x",
      });
      setSimHint(`Dry-run OK — estimateGas ${gas.toString()} (not a guarantee).`);
    } catch (e) {
      setSimHint(
        `Dry-run failed — ${e instanceof Error ? e.message : String(e)}. Do not sign unless you understand why.`,
      );
    }
  }

  const body = (
    <>
      <p className="muted">
        Pair any Pulse site. Browser PulseX ={" "}
        <code>ipfs.app.pulsex.com</code> (not the desktop download page). Also
        Piteas, HEX, ProveX, Phiat, … Paste <code>wc:…</code> — Desk signs on
        Trezor.
      </p>
      {!address ? (
        <p className="muted empty-teach">
          Next: Connect Trezor above, then come back here to pair a site.
        </p>
      ) : (
        <>
          <details className="settings" open={!projectId.trim()}>
            <summary>Project id (once)</summary>
            <label className="field">
              Reown id
              <input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="cloud.reown.com"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <button type="button" className="btn ghost" onClick={saveProjectId}>
              Save
            </button>
            <p className="muted">
              Free id from{" "}
              <a
                className="link"
                href="https://cloud.reown.com"
                target="_blank"
                rel="noreferrer"
              >
                cloud.reown.com
              </a>
              .
            </p>
          </details>

          <label className="field">
            Pair URI
            <textarea
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="wc:…"
              spellCheck={false}
              rows={2}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || !projectId.trim() || !uri.trim()}
            onClick={() => void onPair()}
          >
            {busy ? "…" : "Pair site"}
          </button>

          {sessions.length > 0 ? (
            <ul className="meta">
              {sessions.map((s) => {
                const name =
                  s.peer?.metadata?.name || s.topic.slice(0, 12);
                return (
                  <li key={s.topic}>
                    {name}{" "}
                    <button
                      type="button"
                      className="btn ghost"
                      aria-label={`Drop session ${name}`}
                      onClick={() =>
                        void disconnectTopic(s.topic).then(() =>
                          setSessionsTick((n) => n + 1),
                        )
                      }
                    >
                      Drop
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {proposal ? (
            <div
              className={`clear-box ${phishingWarn(proposal.params.proposer.metadata.url) ? "danger" : "warn"}`}
              role="region"
              aria-label={`Session request from ${proposal.params.proposer.metadata.name}`}
            >
              <strong>{proposal.params.proposer.metadata.name}</strong>
              <p className="muted">
                Origin: {proposal.params.proposer.metadata.url || "(missing)"}
              </p>
              {phishingWarn(proposal.params.proposer.metadata.url) ? (
                <p className="warn-line">
                  {phishingWarn(proposal.params.proposer.metadata.url)!.detail}
                </p>
              ) : null}
              {originAllowed(proposal.params.proposer.metadata.url || "") ===
              false ? (
                <p className="warn-line">
                  You rejected this origin before — Approve will clear that
                  memory.
                </p>
              ) : originAllowed(
                  proposal.params.proposer.metadata.url || "",
                ) === true ? (
                <p className="muted fee">Remembered allow for this origin.</p>
              ) : null}
              {phishingWarn(proposal.params.proposer.metadata.url) ? (
                <label className="hide-zero">
                  <input
                    type="checkbox"
                    checked={blindAck}
                    onChange={(e) => setBlindAck(e.target.checked)}
                  />
                  <span>
                    I understand the origin warn — still approve this session
                  </span>
                </label>
              ) : null}
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={
                    busy ||
                    (!!phishingWarn(proposal.params.proposer.metadata.url) &&
                      !blindAck)
                  }
                  onClick={() => void onApproveSession()}
                  title={
                    phishingWarn(proposal.params.proposer.metadata.url) &&
                    !blindAck
                      ? "Check the origin warn first"
                      : undefined
                  }
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
            <div
              className={`clear-box ${pendingTone}`}
              role="region"
              aria-label={[
                `${pending.method} request`,
                pending.dappUrl ? `from ${pending.dappUrl}` : null,
                ...pending.lines.map((l) => `${l.title}: ${l.detail}`),
              ]
                .filter(Boolean)
                .join(". ")}
            >
              <p>
                <strong>{pending.method}</strong>
                {pending.dappUrl ? (
                  <span className="muted"> · {pending.dappUrl}</span>
                ) : (
                  <span className="warn-line"> · no origin</span>
                )}
              </p>
              <p className="muted fee">
                Explain: {explainClearLines(pending.lines)}
              </p>
              <ul className="clear-list">
                {pending.lines.map((l, i) => (
                  <li key={i} className={l.tone}>
                    <span className="t">{l.title}</span>
                    <span className="d">{l.detail}</span>
                  </li>
                ))}
              </ul>
              {simHint ? (
                <p className="muted fee" role="status">
                  {simHint}
                </p>
              ) : null}
              {needsDangerAck(pending.lines) ? (
                <label className="blind-ack">
                  <input
                    type="checkbox"
                    checked={blindAck}
                    onChange={(e) => setBlindAck(e.target.checked)}
                  />
                  <span>{dangerAckLabel(pending.lines)}</span>
                </label>
              ) : null}
              <div className="row">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void onDryRun()}
                >
                  Dry-run
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={
                    busy ||
                    (needsDangerAck(pending.lines) && !blindAck) ||
                    !!phishingWarn(pending.dappUrl)
                  }
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

          {info ? (
            <p className="muted ok" role="status">
              {info}
            </p>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) return <div className="wc-embed">{body}</div>;
  return <section className="card send wc-card">{body}</section>;
}
