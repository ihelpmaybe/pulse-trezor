/**
 * Real @trezor/connect-web → Bridge. Seed never enters this app.
 * First UI call must stay in the same turn as the user click (no await before it).
 * Adapted from pulse-publish; paths = SYNC0.
 */
import TrezorConnect from "@trezor/connect-web";
import { humanTrezorError } from "./errors";
import { ethAddressPath } from "./paths";

export { humanTrezorError };

let initDone = false;
let initPromise: Promise<void> | null = null;

export function isTrezorInited(): boolean {
  return initDone;
}

export async function ensureTrezorInit(): Promise<void> {
  if (initDone) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await TrezorConnect.init({
        manifest: {
          appName: "Pulse Desk",
          appUrl:
            typeof window !== "undefined"
              ? window.location.origin
              : "http://127.0.0.1:5174",
          email: "pulse-desk@localhost",
        },
        lazyLoad: false,
        coreMode: "iframe",
        connectSrc: "https://connect.trezor.io/9/",
        transports: ["BridgeTransport"],
      });
      initDone = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already\s*initialized/i.test(msg)) {
        initDone = true;
        return;
      }
      initPromise = null;
      throw e;
    }
  })();
  return initPromise;
}

export async function warmTrezorConnect(): Promise<void> {
  await ensureTrezorInit();
}

/** Probe bridge without requiring a device unlock (best-effort). */
export async function probeBridge(): Promise<"ok" | "missing" | "unknown"> {
  try {
    await ensureTrezorInit();
    const feat = await TrezorConnect.getFeatures();
    if (feat.success) return "ok";
    const err = extractErr(feat).toLowerCase();
    if (
      err.includes("bridge") ||
      err.includes("21325") ||
      err.includes("transport") ||
      err.includes("not found")
    ) {
      return "missing";
    }
    // Device locked / not plugged still means bridge answered
    if (err.includes("device") || err.includes("cancel")) return "ok";
    return "unknown";
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (
      msg.includes("bridge") ||
      msg.includes("21325") ||
      msg.includes("transport")
    ) {
      return "missing";
    }
    return "unknown";
  }
}

/**
 * Must be invoked directly from a click handler (no await before getAddress).
 */
export function connectTrezorFromGesture(): Promise<{
  address0: string;
  derivationIndex: number;
  derivationPath: string;
  deviceId: string;
}> {
  if (!initDone) {
    return Promise.reject(
      new Error(
        "Trezor Connect still starting — wait a second, then click again.",
      ),
    );
  }

  const derivationIndex = 0;
  const derivationPath = ethAddressPath(derivationIndex);
  const addressPending = TrezorConnect.ethereumGetAddress({
    path: derivationPath,
    showOnTrezor: true,
  });

  return (async () => {
    const res = await addressPending;
    if (!res.success) {
      throw new Error(humanTrezorError(extractErr(res)));
    }

    const payload = res.payload as { address?: string };
    const address0 = payload.address;
    if (!address0) throw new Error("Trezor returned no address.");

    let deviceId = "trezor-default";
    try {
      const feat = await TrezorConnect.getFeatures();
      if (feat.success && feat.payload) {
        const p = feat.payload as { device_id?: string; label?: string };
        if (p.device_id) deviceId = p.device_id;
        else if (p.label) deviceId = `label:${p.label}`;
      }
    } catch {
      /* address is enough */
    }

    return { address0, derivationIndex, derivationPath, deviceId };
  })();
}

function extractErr(res: unknown): string {
  const fail = res as {
    payload?: { error?: string };
    error?: { message?: string } | string;
  };
  return (
    fail.payload?.error ||
    (typeof fail.error === "string" ? fail.error : fail.error?.message) ||
    "Trezor not available"
  );
}

export { TrezorConnect };
