import { useCallback, useEffect, useState } from "react";
import {
  formatEther,
  isAddress,
  parseEther,
  type Address,
  type Hash,
} from "viem";
import rpcPack from "./pack/rpc.json";
import {
  explorerAddressUrl,
  explorerTxUrl,
  fetchPlsBalance,
  packFor,
  type DeskChainId,
} from "./chain/client";
import {
  connectTrezorFromGesture,
  humanTrezorError,
  probeBridge,
  warmTrezorConnect,
} from "./trezor/connect";
import { SCHEME_ID } from "./trezor/paths";
import { previewFees, sendPlsWithTrezor } from "./trezor/signPulseTx";

const apps = packFor(369).apps!;

type Session = {
  address: Address;
  derivationIndex: number;
  derivationPath: string;
  deviceId: string;
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function App() {
  const [warm, setWarm] = useState(false);
  const [bridge, setBridge] = useState<"ok" | "missing" | "unknown" | "…">(
    "…",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [chainId, setChainId] = useState<DeskChainId>(943);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balBusy, setBalBusy] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [feeHint, setFeeHint] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [copied, setCopied] = useState(false);

  const pack = packFor(chainId);
  const explorerName = pack.explorers?.[0]?.name ?? "explorer";

  useEffect(() => {
    void warmTrezorConnect()
      .then(() => setWarm(true))
      .catch((e) =>
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e))),
      );
    void probeBridge().then(setBridge);
  }, []);

  const refreshBalance = useCallback(async (addr: Address, cid: DeskChainId) => {
    setBalBusy(true);
    try {
      const b = await fetchPlsBalance(cid, addr);
      setBalance(b);
    } catch (e) {
      setBalance(null);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBalBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setBalance(null);
      return;
    }
    void refreshBalance(session.address, chainId);
  }, [session, chainId, refreshBalance]);

  useEffect(() => {
    if (!session || !to || !amount || !isAddress(to)) {
      setFeeHint(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const value = parseEther(amount);
          const p = await previewFees(
            chainId,
            session.address,
            to as Address,
            value,
          );
          if (cancelled) return;
          const feeWei = p.eip1559
            ? p.gas * (p.maxFeePerGas ?? 0n)
            : p.gas * (p.gasPrice ?? 0n);
          setFeeHint(
            `~${formatEther(feeWei)} ${pack.currency.symbol} gas cap · gas ${p.gas.toString()}${p.eip1559 ? " · EIP-1559" : " · legacy"}`,
          );
        } catch {
          if (!cancelled) setFeeHint(null);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [session, to, amount, chainId, pack.currency.symbol]);

  function onConnect() {
    setErr(null);
    setBusy(true);
    const pending = connectTrezorFromGesture();
    void pending
      .then((r) => {
        setSession({
          address: r.address0 as Address,
          derivationIndex: r.derivationIndex,
          derivationPath: r.derivationPath,
          deviceId: r.deviceId,
        });
        void probeBridge().then(setBridge);
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        void probeBridge().then(setBridge);
      })
      .finally(() => setBusy(false));
  }

  function onDisconnect() {
    setSession(null);
    setErr(null);
    setLastTx(null);
    setTo("");
    setAmount("");
  }

  function onCopy() {
    if (!session) return;
    void navigator.clipboard.writeText(session.address).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function onSend() {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    if (!isAddress(to)) {
      setErr("Recipient must be a valid 0x address.");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(amount);
    } catch {
      setErr("Amount must be a number (PLS).");
      return;
    }
    if (value <= 0n) {
      setErr("Amount must be > 0.");
      return;
    }
    setBusy(true);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: to as Address,
      value,
      derivationIndex: session.derivationIndex,
    })
      .then((hash) => {
        setLastTx(hash);
        void refreshBalance(session.address, chainId);
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="page">
      <header className="hdr">
        <h1>Pulse Desk</h1>
        <p className="tag">
          Trezor on PulseChain for <strong>HEX</strong> ·{" "}
          <strong>PulseX</strong> · <strong>ProveX</strong>
        </p>
      </header>

      <div className="grid">
        <section className="card">
          <h2>Device</h2>
          <ul className="meta">
            <li>
              Connect:{" "}
              <span className={warm ? "ok" : "warn"}>
                {warm ? "ready" : "starting…"}
              </span>
            </li>
            <li>
              Bridge:{" "}
              <span
                className={
                  bridge === "ok" ? "ok" : bridge === "missing" ? "bad" : "warn"
                }
              >
                {bridge === "ok"
                  ? "reachable"
                  : bridge === "missing"
                    ? "not found"
                    : bridge === "…"
                      ? "checking…"
                      : "unknown"}
              </span>
            </li>
            <li>
              Scheme: <code>{SCHEME_ID}</code>
            </li>
          </ul>

          <label className="field">
            Network
            <select
              value={chainId}
              onChange={(e) =>
                setChainId(Number(e.target.value) as DeskChainId)
              }
            >
              <option value={943}>Testnet V4 (943) — safe send</option>
              <option value={369}>PulseChain (369)</option>
            </select>
          </label>

          {!session ? (
            <button
              type="button"
              className="btn"
              disabled={busy || !warm}
              onClick={onConnect}
            >
              {busy ? "Connecting…" : "Connect Trezor"}
            </button>
          ) : (
            <div className="session">
              <p className="addr-full">
                <code title={session.address}>{session.address}</code>
              </p>
              <p className="muted">
                Path <code>{session.derivationPath}</code> · verify on device
              </p>
              <div className="row">
                <button type="button" className="btn ghost" onClick={onCopy}>
                  {copied ? "Copied" : "Copy receive"}
                </button>
                <a
                  className="link"
                  href={explorerAddressUrl(chainId, session.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {explorerName}
                </a>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onDisconnect}
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Balance · {pack.currency.symbol}</h2>
          {!session ? (
            <p className="muted">Connect Trezor to load balance.</p>
          ) : (
            <>
              <p className="bal">
                {balBusy
                  ? "…"
                  : balance == null
                    ? "—"
                    : `${formatEther(balance)} ${pack.currency.symbol}`}
              </p>
              <button
                type="button"
                className="btn ghost"
                disabled={balBusy}
                onClick={() => void refreshBalance(session.address, chainId)}
              >
                Refresh
              </button>
            </>
          )}
        </section>

        <section className="card send">
          <h2>Send PLS</h2>
          {!session ? (
            <p className="muted">Connect first. Prefer testnet 943.</p>
          ) : (
            <>
              <label className="field">
                To
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value.trim())}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                Amount ({pack.currency.symbol})
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  inputMode="decimal"
                />
              </label>
              {feeHint ? <p className="muted fee">{feeHint}</p> : null}
              <button
                type="button"
                className="btn"
                disabled={busy || !to || !amount}
                onClick={onSend}
              >
                {busy ? "Signing…" : `Sign & send on ${chainId}`}
              </button>
              {chainId === 369 ? (
                <p className="warn-line">Mainnet 369 — real funds.</p>
              ) : null}
              {lastTx ? (
                <p>
                  Sent{" "}
                  <a
                    className="link"
                    href={explorerTxUrl(chainId, lastTx)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddr(lastTx)}
                  </a>
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="card links">
          <h2>Core apps</h2>
          <ul className="app-grid">
            <li>
              <a href={apps.hex} target="_blank" rel="noreferrer">
                HEX
              </a>
            </li>
            <li>
              <a href={apps.pulsex} target="_blank" rel="noreferrer">
                PulseX
              </a>
            </li>
            <li>
              <a href={apps.provex} target="_blank" rel="noreferrer">
                ProveX
              </a>
            </li>
          </ul>
          <p className="muted">
            Pack pulse-core v{rpcPack.version} · A1
          </p>
        </section>
      </div>

      {err ? <p className="err banner">{err}</p> : null}
    </div>
  );
}
