/**
 * Honest network / install face — shell may be cached; chain still needs net.
 */
import { useEffect, useState } from "react";
import { t } from "../i18n/en";

function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return !!nav.standalone;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMq = () => setStandalone(isStandalone());
    mq.addEventListener?.("change", onMq);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  if (online && !standalone) return null;

  return (
    <div
      className={
        online ? "offline-banner offline-banner-ok" : "offline-banner"
      }
      role="status"
    >
      {!online ? (
        <span>{t("offlineBanner")}</span>
      ) : (
        <span>{t("pwaInstalled")}</span>
      )}
    </div>
  );
}
