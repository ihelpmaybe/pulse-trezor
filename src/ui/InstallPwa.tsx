/**
 * One-click install when the browser fires beforeinstallprompt (HTTPS / localhost).
 */
import { useEffect, useState } from "react";

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
    return (
      <p className="muted fee">
        Installed as an app on this device. Suite still needs a network when you
        sign.
      </p>
    );
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
        {deferred ? "Install Pulse Perch" : "Install (when browser offers)"}
      </button>
      <p className="muted fee">
        {deferred
          ? "Adds a desktop / home-screen app — no MetaMask, no store. Chain calls still need Suite + network."
          : "Chrome/Edge on localhost or HTTPS may offer install after a visit. Or: npm run build && npm run preview, then Install."}
      </p>
      {hint ? <p className="muted fee">{hint}</p> : null}
      {!deferred ? (
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            setHint(
              typeof window !== "undefined" && "serviceWorker" in navigator
                ? "SW shell-v4 caches the face only — never RPC. Use Chrome’s install icon in the address bar, or reopen after preview."
                : "This browser cannot install PWAs.",
            )
          }
        >
          How to install
        </button>
      ) : null}
    </div>
  );
}
