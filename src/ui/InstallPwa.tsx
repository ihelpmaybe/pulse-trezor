/**
 * One-click install when the browser fires beforeinstallprompt (HTTPS / localhost).
 * Hidden when the browser has nothing to offer.
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
    return (
      <>
        <h4 className="settings-section">Install</h4>
        <p className="muted fee">{t("pwaInstalled")}</p>
      </>
    );
  }

  if (!deferred) return null;

  return (
    <>
      <h4 className="settings-section">Install</h4>
      <div className="install-pwa">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void deferred.prompt().then(async () => {
              const choice = await deferred.userChoice;
              if (choice.outcome === "accepted") setDone(true);
              setDeferred(null);
            });
          }}
        >
          {t("installPulsePerch")}
        </button>
      </div>
    </>
  );
}
