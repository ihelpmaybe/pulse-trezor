import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  hasHardDeadEnd,
  needsDangerAck,
  phishingWarn,
  worstTone,
  type ClearLine,
  type TxLike,
} from "./clearSign";
import { assertSiweAllowed } from "./siweGate";
import {
  parseTypedDataParams,
  signPersonalMessage,
  signTypedData,
} from "../trezor/signMessage";
import { t } from "../i18n/en";
import { sendPlsWithTrezor } from "../trezor/signPulseTx";
import { softenWcSendError, wcSendTxCoach } from "./txSoftPath";
import {
  activeSessions,
  approveProposal,
  disconnectAllSessions,
  disconnectTopic,
  getWalletKit,
  initWalletKit,
  pairUri,
  rejectProposal,
} from "./walletKit";
import { isShowcase, PERCH_RELEASES } from "../showcase";
import {
  chainLabel,
  hasChainPack,
  isDeskChainId,
  parseChainRef,
  type DeskChainId,
} from "../chain/client";
import { addEthereumChainFromEip3085 } from "../chain/evmNetworks";
import { originAllowed, rememberOrigin } from "../chain/wcOrigins";
import { getVerifyState, verifyFace } from "./verify";

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
  /** When true, no outer card chrome (for embedding in Apps tab). */
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
  /** Queue — a second proposal/request must not clobber the first. */
  const [proposalQ, setProposalQ] = useState<
    WalletKitTypes.SessionProposal[]
  >([]);
  const [pendingQ, setPendingQ] = useState<PendingReq[]>([]);
  const proposal = proposalQ[0] ?? null;
  const pending = pendingQ[0] ?? null;
  const [blindAck, setBlindAck] = useState(false);
  const [verifyAck, setVerifyAck] = useState(false);
  const [sessionsTick, setSessionsTick] = useState(0);
  const [wired, setWired] = useState(false);
  const addressRef = useRef(address);
  addressRef.current = address;

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

  useEffect(() => {
    setVerifyAck(false);
    setBlindAck(false);
  }, [proposal?.id]);

  const proposalVerify = useMemo(() => {
    if (!proposal) return null;
    const state = getVerifyState(
      (proposal as { verifyContext?: unknown }).verifyContext as
        | Parameters<typeof getVerifyState>[0]
        | undefined,
    );
    return { state, face: verifyFace(state) };
  }, [proposal]);

  const wireKitEvents = useCallback(() => {
    const kit = getWalletKit();
    if (!kit || wired) return;

    kit.on("session_proposal", (p) => {
      setProposalQ((q) => [...q, p]);
      setInfo(`Session proposal from ${p.params.proposer.metadata.name}`);
      setSessionsTick((n) => n + 1);
    });

    kit.on("session_request", async (event) => {
      const { topic, params, id } = event;
      const method = params.request.method;
      const reqParams = params.request.params;
      const peer = kit.getActiveSessions()[topic]?.peer?.metadata;
      const dappUrl = peer?.url || peer?.name || "";
      const reqChain =
        parseChainRef(params.chainId) ?? activeChainId;
      const reqVerify = getVerifyState(
        (event as { verifyContext?: Parameters<typeof getVerifyState>[0] })
          .verifyContext,
      );
      const reqVerifyFace = verifyFace(reqVerify);

      if (
        method === "wallet_switchEthereumChain" ||
        method === "wallet_addEthereumChain"
      ) {
        const rawObj = (reqParams as Record<string, unknown>[])?.[0] ?? {};
        const raw =
          (rawObj as { chainId?: string }).chainId ??
          (reqParams as { chainId?: string })?.chainId;
        const next = parseChainRef(raw);
        if (
          next &&
          isDeskChainId(next) &&
          hasChainPack(next) &&
          method === "wallet_switchEthereumChain"
        ) {
          onSwitchChain?.(next);
          await kit.respondSessionRequest({
            topic,
            response: { id, jsonrpc: "2.0", result: null },
          });
          setInfo(`Switched to ${chainLabel(next)} (${next})`);
          return;
        }
        if (method === "wallet_addEthereumChain" && next && isDeskChainId(next)) {
          try {
            if (!hasChainPack(next)) {
              const label =
                String((rawObj as { chainName?: string }).chainName || "") ||
                `Chain ${next}`;
              const ok = window.confirm(
                `Add ${label} (${next}) and switch?\n\nPerch pulls public RPCs from Chainlist when possible.`,
              );
              if (!ok) throw new Error("User rejected add-chain");
              await addEthereumChainFromEip3085({
                chainId: raw,
                chainName: (rawObj as { chainName?: string }).chainName,
                nativeCurrency: (
                  rawObj as {
                    nativeCurrency?: {
                      name?: string;
                      symbol?: string;
                      decimals?: number;
                    };
                  }
                ).nativeCurrency,
                rpcUrls: (rawObj as { rpcUrls?: string[] }).rpcUrls,
                blockExplorerUrls: (rawObj as { blockExplorerUrls?: string[] })
                  .blockExplorerUrls,
              });
            }
            onSwitchChain?.(next);
            await kit.respondSessionRequest({
              topic,
              response: { id, jsonrpc: "2.0", result: null },
            });
            setInfo(`Added / switched to ${chainLabel(next)} (${next})`);
          } catch (e) {
            await kit.respondSessionRequest({
              topic,
              response: {
                id,
                jsonrpc: "2.0",
                error: getSdkError("USER_REJECTED"),
              },
            });
            onError(e instanceof Error ? e.message : String(e));
          }
          return;
        }
        await kit.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: "2.0",
            error: getSdkError("UNSUPPORTED_CHAINS"),
          },
        });
        onError(
          next && !hasChainPack(next)
            ? `Chain ${next} not added yet — Settings → Networks`
            : `dApp asked for unsupported chain ${raw ?? "?"} — rejected`,
        );
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
          chainId: Number(reqChain) || undefined,
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
        lines = clearSignMessage({
          method,
          dappUrl,
          preview,
          address: addressRef.current,
          chainId: reqChain,
        });
      }

      lines = [
        {
          tone: reqVerifyFace.tone,
          title: reqVerifyFace.title,
          detail: reqVerifyFace.detail,
        },
        ...lines,
      ];

      setPendingQ((q) => [
        ...q,
        {
          id,
          topic,
          method,
          params: reqParams,
          dappUrl,
          lines,
          chainId: reqChain,
        },
      ]);
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
      if (!address) throw new Error("Connect Trezor with Suite up first");
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

  function dropHeadProposal() {
    setProposalQ((q) => q.slice(1));
  }

  function isExpiredProposalError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return /proposal id doesn't exist|No matching key|expired/i.test(msg);
  }

  async function onApproveSession() {
    if (!proposal || !address) return;
    setBusy(true);
    onError(null);
    try {
      await approveProposal(proposal, address);
      rememberOrigin(proposal.params.proposer.metadata.url || "", true);
      dropHeadProposal();
      setInfo("Session approved — dApp can request signs");
      setSessionsTick((n) => n + 1);
    } catch (e) {
      dropHeadProposal();
      if (isExpiredProposalError(e)) {
        setInfo("That pair request expired — paste a fresh wc: URI");
        onError(null);
      } else {
        onError(e instanceof Error ? e.message : String(e));
      }
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
      dropHeadProposal();
      setInfo("Session rejected");
    } catch (e) {
      dropHeadProposal();
      if (isExpiredProposalError(e)) {
        setInfo("Stale pair request cleared");
        onError(null);
      } else {
        onError(e instanceof Error ? e.message : String(e));
      }
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
    const { method, params, topic, id } = pending;
    try {
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
        assertSiweAllowed({
          message,
          dappUrl: pending.dappUrl,
          address,
          chainId: pending.chainId,
        });
        if (hasHardDeadEnd(pending.lines)) {
          throw new Error(
            pending.lines.find((l) => /SIWE · blocked/i.test(l.title))
              ?.detail || "Blocked — refuse to sign",
          );
        }
        result = await signPersonalMessage(message, derivationIndex);
      } else if (/signTypedData/i.test(method)) {
        const { data } = parseTypedDataParams(params);
        result = await signTypedData(data, derivationIndex);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      if (method === "eth_sendTransaction") {
        const hash = typeof result === "string" ? result : "";
        if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
          throw new Error(
            "No tx hash after broadcast — not claiming Signed. Check Activity / Suite.",
          );
        }
      }

      await kit.respondSessionRequest({
        topic,
        response: { id, jsonrpc: "2.0", result },
      });
      setPendingQ((q) => q.slice(1));
      if (method === "eth_sendTransaction") {
        const hash = result as string;
        setInfo(`Broadcast · ${hash.slice(0, 10)}…${hash.slice(-4)}`);
      } else {
        setInfo(`Signed · ${method}`);
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const soft =
        method === "eth_sendTransaction" ? softenWcSendError(raw) : null;
      onError(soft || raw);
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
      setPendingQ((q) => q.slice(1));
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
      setPendingQ((q) => q.slice(1));
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
      const { simulateDeskTx } = await import("../chain/txSimulate");
      const r = await simulateDeskTx({
        chainId: pending.chainId,
        from: address,
        to: tx.to as Address,
        valueWei:
          tx.value != null ? BigInt(valueToHex(tx.value) || "0x0") : 0n,
        data: (tx.data as Hex) || "0x",
      });
      const deltas =
        r.balanceHints.length > 0
          ? ` · Δ ${r.balanceHints.slice(0, 3).join(" · ")}`
          : "";
      setSimHint(`${r.detail}${deltas}`);
    } catch (e) {
      setSimHint(
        `Dry-run failed — ${e instanceof Error ? e.message : String(e)}. Do not sign unless you understand why.`,
      );
    }
  }

  if (isShowcase()) {
    const peek = (
      <div className="card">
        <p className="muted">
          Showcase — WalletConnect / Sites only after you run Perch locally
          (zip → Open-Pulse-Perch.cmd or npm run dev). Allowlist localhost on
          your Reown project — not github.io.
        </p>
        <p>
          <a className="btn" href={PERCH_RELEASES} target="_blank" rel="noreferrer">
            Download zip
          </a>
        </p>
      </div>
    );
    if (embedded) return <div className="wc-embed">{peek}</div>;
    return peek;
  }

  const body = (
    <>
      <p className="muted">{t("appsPairIntro")}</p>
      {!address ? (
        <p className="muted empty-teach">Connect above, then paste a wc: URI.</p>
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
            {busy ? "…" : t("pairSite")}
          </button>

          {sessions.length > 0 ? (
            <>
              <ul className="meta" data-testid="wc-sessions">
                {sessions.map((s) => {
                  const name =
                    s.peer?.metadata?.name || s.topic.slice(0, 12);
                  return (
                    <li key={s.topic} data-wc-session={name}>
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
              <div className="row">
                <p className="muted fee">
                  {sessions.length} site{sessions.length === 1 ? "" : "s"} paired
                </p>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  data-testid="wc-kill-all"
                  onClick={() => {
                    setBusy(true);
                    void disconnectAllSessions()
                      .then((n) => {
                        setSessionsTick((t) => t + 1);
                        setInfo(
                          n
                            ? `Dropped ${n} WalletConnect session${n === 1 ? "" : "s"}`
                            : "No sessions to drop",
                        );
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  Kill all sessions
                </button>
              </div>
            </>
          ) : null}
          {proposalQ.length > 1 ? (
            <p className="muted">
              {proposalQ.length - 1} more session request
              {proposalQ.length > 2 ? "s" : ""} waiting
            </p>
          ) : null}
          {pendingQ.length > 1 ? (
            <p className="muted">
              {pendingQ.length - 1} more sign request
              {pendingQ.length > 2 ? "s" : ""} waiting
            </p>
          ) : null}

          {proposal ? (
            <div
              className={`clear-box ${
                proposalVerify?.face.tone === "danger" ||
                phishingWarn(proposal.params.proposer.metadata.url)
                  ? "danger"
                  : proposalVerify?.face.tone === "ok"
                    ? "ok"
                    : "warn"
              }`}
              role="region"
              aria-label={`Session request from ${proposal.params.proposer.metadata.name}`}
            >
              <strong>{proposal.params.proposer.metadata.name}</strong>
              <p className="muted">
                Origin: {proposal.params.proposer.metadata.url || "(missing)"}
              </p>
              {proposalVerify ? (
                <p
                  className={
                    proposalVerify.face.tone === "danger"
                      ? "warn-line"
                      : "muted fee"
                  }
                  data-testid="wc-verify"
                  data-verify={proposalVerify.state}
                >
                  {proposalVerify.face.title}: {proposalVerify.face.detail}
                </p>
              ) : null}
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
              {proposalVerify?.face.needsAck ? (
                <label className="hide-zero">
                  <input
                    type="checkbox"
                    checked={verifyAck}
                    onChange={(e) => setVerifyAck(e.target.checked)}
                  />
                  <span>
                    I understand Verify {proposalVerify.state.toLowerCase()} —
                    still approve this session
                  </span>
                </label>
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
                      !blindAck) ||
                    (!!proposalVerify?.face.needsAck && !verifyAck)
                  }
                  onClick={() => void onApproveSession()}
                  title={
                    (phishingWarn(proposal.params.proposer.metadata.url) &&
                      !blindAck) ||
                    (proposalVerify?.face.needsAck && !verifyAck)
                      ? "Check the Verify / origin warn first"
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
              {pending.method === "eth_sendTransaction" ? (
                <p className="muted fee" role="status">
                  {wcSendTxCoach()}
                </p>
              ) : null}
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
              {hasHardDeadEnd(pending.lines) ? (
                <p className="warn-line" role="alert">
                  Hard block — Sign stays off. Reject and leave this site.
                </p>
              ) : needsDangerAck(pending.lines) ? (
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
                    hasHardDeadEnd(pending.lines) ||
                    (needsDangerAck(pending.lines) && !blindAck) ||
                    !!phishingWarn(pending.dappUrl)
                  }
                  onClick={() => void onApproveRequest()}
                  title={
                    hasHardDeadEnd(pending.lines)
                      ? "Blocked — login domain does not match this site"
                      : undefined
                  }
                >
                  {t("signOnTrezor")}
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
