/**
 * Portable zip: keep the hidden serve-desk alive with heartbeats, and signal
 * bye on tab close so the server exits (folder unlocks) after a short grace.
 */
import { useEffect } from "react";
import { useLocalDeskPack } from "./LocalDeskQuit";

const PING_MS = 10_000;

function postBeacon(path: string): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(path);
      if (ok) return;
    }
  } catch {
    /* fall through */
  }
  try {
    void fetch(path, { method: "POST", cache: "no-store", keepalive: true });
  } catch {
    /* ignore */
  }
}

export function LocalDeskLifecycle() {
  const local = useLocalDeskPack();

  useEffect(() => {
    if (!local) return;

    const ping = () => {
      void fetch("/__perch/ping", { method: "POST", cache: "no-store" }).catch(
        () => {},
      );
    };

    ping();
    const id = window.setInterval(ping, PING_MS);

    const onPageHide = () => {
      postBeacon("/__perch/bye");
    };

    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [local]);

  return null;
}
