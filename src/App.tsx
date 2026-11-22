import { useEffect, useState } from "react";
import rpcPack from "./pack/rpc.json";
import {
  connectTrezorFromGesture,
  humanTrezorError,
  probeBridge,
  warmTrezorConnect,
} from "./trezor/connect";
import { SCHEME_ID } from "./trezor/paths";

const main = rpcPack.chains.find((c) => c.chainId === 369)!;
const explorer = main.explorers[0]!;
const apps = main.apps!;

type Session = {
  address: string;
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

  useEffect(() => {
    void warmTrezorConnect()
      .then(() => setWarm(true))
      .catch((e) =>
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e))),
      );
    void probeBridge().then(setBridge);
  }, []);

  function onConnect() {
    setErr(null);
    setBusy(true);
    // NO await before gesture — popup must open in this turn.
    const pending = connectTrezorFromGesture();
    void pending
      .then((r) => {
        setSession({
          address: r.address0,
          derivationIndex: r.derivationIndex,
          derivationPath: r.derivationPath,
          deviceId: r.deviceId,
        });
        void probeBridge().then(setBridge);
      })
      .catch((e) => {
        setErr(
          humanTrezorError(e instanceof Error ? e.message : String(e)),
        );
        void probeBridge().then(setBridge);
      })
      .finally(() => setBusy(false));
  }

  function onDisconnect() {
    setSession(null);
    setErr(null);
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

      <section className="card">
        <h2>Device</h2>
        <ul className="meta">
          <li>
            Connect warm:{" "}
            <span className={warm ? "ok" : "warn"}>
              {warm ? "ready" : "starting…"}
            </span>
          </li>
          <li>
            Bridge (:21325):{" "}
            <span
              className={
                bridge === "ok" ? "ok" : bridge === "missing" ? "bad" : "warn"
              }
            >
              {bridge === "ok"
                ? "reachable"
                : bridge === "missing"
                  ? "not found — start Trezor Suite Bridge"
                  : bridge === "…"
                    ? "checking…"
                    : "unknown — plug device / allow local network"}
            </span>
          </li>
          <li>
            Chain: {main.name} ({main.chainId}) · {main.currency.symbol}
          </li>
          <li>
            Scheme: <code>{SCHEME_ID}</code>
          </li>
        </ul>

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
            <p>
              Address (verify on device):{" "}
              <code title={session.address}>{shortAddr(session.address)}</code>
            </p>
            <p>
              Path: <code>{session.derivationPath}</code>
            </p>
            <p className="muted">Device id: {session.deviceId}</p>
            <div className="row">
              <a
                className="link"
                href={`${explorer.url}/address/${session.address}`}
                target="_blank"
                rel="noreferrer"
              >
                Open on {explorer.name}
              </a>
              <button type="button" className="btn ghost" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          </div>
        )}

        {err ? <p className="err">{err}</p> : null}
      </section>

      <section className="card links">
        <h2>Core apps</h2>
        <ul>
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
          <li>
            <a href={explorer.url} target="_blank" rel="noreferrer">
              {explorer.name}
            </a>
          </li>
        </ul>
        <p className="muted">
          A0 bootstrap — send/balance land in PRIORITY #5. Pack: pulse-core v
          {rpcPack.version}.
        </p>
      </section>
    </div>
  );
}
