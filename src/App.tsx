import { useCallback, useEffect, useState } from "react";
import {
  formatEther,
  isAddress,
  maxUint256,
  parseEther,
  type Address,
  type Hash,
} from "viem";
import deeplinks from "./pack/deeplinks.json";
import {
  explorerAddressUrl,
  explorerTxUrl,
  fetchPlsBalance,
  packFor,
  type DeskChainId,
} from "./chain/client";
import {
  encodeErc20Approve,
  encodeErc20Transfer,
  fetchTokenBalances,
  parseTokenAmount,
  type PackToken,
} from "./chain/tokens";
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

type TokenRow = { token: PackToken; raw: bigint; formatted: string };

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
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [feeHint, setFeeHint] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [copied, setCopied] = useState(false);
  const [asset, setAsset] = useState<"PLS" | string>("PLS");
  const [spender, setSpender] = useState("");
  const [approveAmt, setApproveAmt] = useState("");

  const pack = packFor(chainId);
  const explorerName = pack.explorers?.[0]?.name ?? "explorer";
  const selectedToken =
    asset === "PLS"
      ? null
      : tokenRows.find((r) => r.token.address.toLowerCase() === asset.toLowerCase())
          ?.token ?? null;

  useEffect(() => {
    void warmTrezorConnect()
      .then(() => setWarm(true))
      .catch((e) =>
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e))),
      );
    void probeBridge().then(setBridge);
  }, []);

  const refreshBalances = useCallback(
    async (addr: Address, cid: DeskChainId) => {
      setBalBusy(true);
      try {
        const b = await fetchPlsBalance(cid, addr);
        setBalance(b);
        const rows = await fetchTokenBalances(cid, addr);
        setTokenRows(rows);
      } catch (e) {
        setBalance(null);
        setTokenRows([]);
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBalBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!session) {
      setBalance(null);
      setTokenRows([]);
      return;
    }
    void refreshBalances(session.address, chainId);
  }, [session, chainId, refreshBalances]);

  useEffect(() => {
    if (!session || !to || !amount || !isAddress(to)) {
      setFeeHint(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          let value = 0n;
          let data: `0x${string}` = "0x";
          let txTo = to as Address;
          if (asset === "PLS") {
            value = parseEther(amount);
          } else if (selectedToken) {
            const raw = parseTokenAmount(amount, selectedToken.decimals);
            data = encodeErc20Transfer(to as Address, raw);
            txTo = selectedToken.address as Address;
          } else {
            setFeeHint(null);
            return;
          }
          const p = await previewFees(
            chainId,
            session.address,
            txTo,
            value,
            data,
          );
          if (cancelled) return;
          const feeWei = p.eip1559
            ? p.gas * (p.maxFeePerGas ?? 0n)
            : p.gas * (p.gasPrice ?? 0n);
          setFeeHint(
            `~${formatEther(feeWei)} ${pack.currency.symbol} gas cap · gas ${p.gas.toString()}`,
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
  }, [
    session,
    to,
    amount,
    chainId,
    pack.currency.symbol,
    asset,
    selectedToken,
  ]);

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
    setBusy(true);
    void (async () => {
      try {
        let value = 0n;
        let data: `0x${string}` | undefined;
        let txTo = to as Address;
        if (asset === "PLS") {
          value = parseEther(amount);
        } else {
          if (!selectedToken) throw new Error("Pick a token.");
          if (chainId !== 369) {
            throw new Error("ERC-20 list is mainnet 369 only.");
          }
          const raw = parseTokenAmount(amount, selectedToken.decimals);
          if (raw <= 0n) throw new Error("Amount must be > 0.");
          data = encodeErc20Transfer(to as Address, raw);
          txTo = selectedToken.address as Address;
        }
        if (asset === "PLS" && value <= 0n) {
          throw new Error("Amount must be > 0.");
        }
        const hash = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: txTo,
          value,
          data,
          derivationIndex: session.derivationIndex,
        });
        setLastTx(hash);
        void refreshBalances(session.address, chainId);
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      } finally {
        setBusy(false);
      }
    })();
  }

  function onApprove(unlimited: boolean) {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    if (chainId !== 369) {
      setErr("Approve is mainnet 369 only.");
      return;
    }
    if (!selectedToken || asset === "PLS") {
      setErr("Pick an ERC-20 (not PLS) to approve.");
      return;
    }
    if (!isAddress(spender)) {
      setErr("Spender must be a valid 0x address (e.g. PulseX router).");
      return;
    }
    let raw: bigint;
    try {
      raw = unlimited
        ? maxUint256
        : parseTokenAmount(approveAmt, selectedToken.decimals);
    } catch {
      setErr("Approve amount invalid.");
      return;
    }
    if (!unlimited && raw < 0n) {
      setErr("Approve amount invalid.");
      return;
    }
    setBusy(true);
    const data = encodeErc20Approve(spender as Address, raw);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: selectedToken.address as Address,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
    })
      .then((hash) => {
        setLastTx(hash);
        void refreshBalances(session.address, chainId);
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
              onChange={(e) => {
                setChainId(Number(e.target.value) as DeskChainId);
                setAsset("PLS");
              }}
            >
              <option value={943}>Testnet V4 (943) — safe PLS send</option>
              <option value={369}>PulseChain (369) — tokens</option>
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
          <h2>Balances</h2>
          {!session ? (
            <p className="muted">Connect Trezor to load balances.</p>
          ) : (
            <>
              <p className="bal">
                {balBusy
                  ? "…"
                  : balance == null
                    ? "—"
                    : `${formatEther(balance)} ${pack.currency.symbol}`}
              </p>
              {chainId === 369 ? (
                <ul className="token-grid">
                  {tokenRows.map((r) => (
                    <li key={r.token.address}>
                      <button
                        type="button"
                        className={
                          asset === r.token.address ? "tok on" : "tok"
                        }
                        onClick={() => setAsset(r.token.address)}
                        title={r.token.name}
                      >
                        <span>{r.token.symbol}</span>
                        <span className="muted">{r.formatted}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  ERC-20 (HEX/PLSX/…) on mainnet 369 only.
                </p>
              )}
              <div className="row">
                <button
                  type="button"
                  className={asset === "PLS" ? "btn" : "btn ghost"}
                  onClick={() => setAsset("PLS")}
                >
                  Use PLS
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={balBusy}
                  onClick={() => void refreshBalances(session.address, chainId)}
                >
                  Refresh
                </button>
              </div>
            </>
          )}
        </section>

        <section className="card send">
          <h2>Send {asset === "PLS" ? "PLS" : selectedToken?.symbol ?? "token"}</h2>
          {!session ? (
            <p className="muted">Connect first. Prefer testnet 943 for PLS.</p>
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
                Amount
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
                  Tx{" "}
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

        <section className="card send">
          <h2>Approve (clear-sign)</h2>
          {!session || chainId !== 369 ? (
            <p className="muted">
              Switch to 369 + pick HEX/PLSX/… then set spender.
            </p>
          ) : (
            <>
              <p className="muted">
                Token:{" "}
                <strong>
                  {selectedToken ? selectedToken.symbol : "pick from balances"}
                </strong>
              </p>
              <label className="field">
                Spender (router / escrow)
                <input
                  value={spender}
                  onChange={(e) => setSpender(e.target.value.trim())}
                  placeholder="0x… PulseX router etc."
                  spellCheck={false}
                />
              </label>
              <label className="field">
                Amount (or use unlimited)
                <input
                  value={approveAmt}
                  onChange={(e) => setApproveAmt(e.target.value)}
                  placeholder="exact amount"
                  inputMode="decimal"
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={busy || !spender || !selectedToken}
                  onClick={() => onApprove(false)}
                >
                  Approve amount
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy || !spender || !selectedToken}
                  onClick={() => onApprove(true)}
                >
                  Approve max
                </button>
              </div>
              <p className="warn-line">
                Read spender on device. Max = unlimited allowance.
              </p>
            </>
          )}
        </section>

        <section className="card links">
          <h2>Open on Pulse</h2>
          <p className="muted">
            Adopt builders — we don’t rebuild these. Pack deeplinks v
            {deeplinks.version}.
          </p>
          <ul className="app-grid open-rail">
            {[...deeplinks.core, ...deeplinks.defi, ...deeplinks.tools]
              .filter((d) => d.quality === "A" || d.quality === "B")
              .map((d) => {
                const href =
                  ("app" in d && d.app) ||
                  ("url" in d && d.url) ||
                  ("github" in d && d.github) ||
                  "#";
                return (
                  <li key={d.id}>
                    <a href={href} target="_blank" rel="noreferrer">
                      {d.name}
                      <span className="muted"> · {d.quality}</span>
                    </a>
                  </li>
                );
              })}
          </ul>
          <p className="muted">
            Legacy pack apps:{" "}
            <a href={apps.hex} target="_blank" rel="noreferrer">
              HEX
            </a>{" "}
            ·{" "}
            <a href={apps.pulsex} target="_blank" rel="noreferrer">
              PulseX
            </a>{" "}
            ·{" "}
            <a href={apps.provex} target="_blank" rel="noreferrer">
              ProveX
            </a>
          </p>
        </section>
      </div>

      {err ? <p className="err banner">{err}</p> : null}
    </div>
  );
}
