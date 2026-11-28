/**
 * Portable Windows zip: show Quit when the local static pack is serving.
 * Calls /__perch/quit so the hidden PowerShell server exits (no black window needed).
 */
import { useEffect, useState } from "react";
import { t } from "../i18n/en";
import { isShowcase } from "../showcase";

function isLoopbackHost(): boolean {
  try {
    const h = window.location.hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
  } catch {
    return false;
  }
}

async function probeLocalPack(): Promise<boolean> {
  if (isShowcase() || !isLoopbackHost()) return false;
  try {
    const res = await fetch("/__perch/local", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { local?: boolean };
    return data.local === true;
  } catch {
    return false;
  }
}

export function useLocalDeskPack(): boolean {
  const [local, setLocal] = useState(false);
  useEffect(() => {
    let alive = true;
    void probeLocalPack().then((ok) => {
      if (alive) setLocal(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  return local;
}

async function quitLocalDesk(): Promise<void> {
  try {
    await fetch("/__perch/quit", { method: "POST", cache: "no-store" });
  } catch {
    /* server closes the socket — fetch may throw */
  }
}

type Props = {
  /** Compact control for the top desk tools row. */
  compact?: boolean;
};

export function LocalDeskQuit({ compact }: Props) {
  const local = useLocalDeskPack();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!local) return null;

  if (done) {
    return compact ? null : (
      <p className="muted fee">{t("localDeskStopped")}</p>
    );
  }

  const onQuit = () => {
    if (busy) return;
    setBusy(true);
    void quitLocalDesk().finally(() => {
      setDone(true);
      setBusy(false);
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        className="btn ghost rpc-pop-btn"
        aria-label={t("quitPulsePerch")}
        title={t("quitPulsePerchHint")}
        disabled={busy}
        onClick={onQuit}
      >
        <span className="faq-btn-label" aria-hidden="true">
          ✕
        </span>
      </button>
    );
  }

  return (
    <>
      <h4 className="settings-section">{t("localDeskSection")}</h4>
      <p className="muted fee">{t("localDeskBlurb")}</p>
      <button type="button" className="btn" disabled={busy} onClick={onQuit}>
        {busy ? t("quittingPulsePerch") : t("quitPulsePerch")}
      </button>
    </>
  );
}
