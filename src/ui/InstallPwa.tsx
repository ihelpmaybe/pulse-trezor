/**
 * One-click install when the browser fires beforeinstallprompt (HTTPS / localhost).
 */
import { useEffect, useState } from "react";
import { t } from "../i18n/en";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return !!nav.standalone;
  } catch {
    return false;
  }
}

export function InstallPwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [done, setDone] = useState(() => isStandalone());
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) setDone(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDone(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (done) {
    return <p className="muted fee">{t("pwaInstalledLong")}</p>;
  }

  return (
    <div className="install-pwa">
      <button
        type="button"
        className="btn ghost"
        disabled={!deferred}
        onClick={() => {
          if (!deferred) return;
          void deferred.prompt().then(async () => {
            const choice = await deferred.userChoice;
            if (choice.outcome === "accepted") setDone(true);
            setDeferred(null);
          });
        }}
      >
        {deferred ? t("installPulsePerch") : t("installWhenOffered")}
      </button>
      <p className="muted fee">
        {deferred ? t("installHintReady") : t("installHintWait")}
      </p>
      {hint ? <p className="muted fee">{hint}</p> : null}
      {!deferred ? (
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            setHint(
              typeof window !== "undefined" && "serviceWorker" in navigator
                ? t("installHintSw")
                : t("installHintNoPwa"),
            )
          }
        >
          {t("howToInstall")}
        </button>
      ) : null}
    </div>
  );
}
