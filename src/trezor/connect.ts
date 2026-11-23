/**
 * Real @trezor/connect-web v10 → Trezor Suite (Desktop WS or Suite Web popup).
 * Seed never enters this app. Device wire is owned by Suite — not legacy Bridge :21325.
 * Suite Desktop uses localhost WS (not a browser popup), so we may await init
 * inside the click handler before ethereumGetAddress.
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

/** After Cancel/HMR, Connect can report "not initialized" while our flag is still true. */
export function resetTrezorInit(): void {
  initDone = false;
  initPromise = null;
  try {
    TrezorConnect.dispose();
  } catch {
    /* ignore */
  }
}

export async function ensureTrezorInit(): Promise<void> {
  if (initDone) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // Connect 10: no connectSrc / transports / iframe Bridge — Suite hosts core.
      await TrezorConnect.init({
        // Prefer Suite Desktop WS; fall back to Suite Web popup only if desktop missing.
        coreMode: "auto",
        manifest: {
          appName: "Pulse Perch",
          appUrl:
            typeof window !== "undefined"
              ? window.location.origin
              : "http://127.0.0.1:5174",
          email: "pulse-perch@localhost",
        },
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

/**
 * Best-effort: Suite Desktop connect-ws. Do not call getFeatures here.
 * Probe is independent of Connect init — wrong URL used to false-flag "Suite missing".
 */
export async function probeSuite(): Promise<"ok" | "missing" | "unknown"> {
  try {
    const ws = new WebSocket("ws://127.0.0.1:21335/connect-ws");
    const state = await new Promise<"ok" | "missing">((resolve) => {
      let settled = false;
      const done = (v: "ok" | "missing") => {
        if (settled) return;
        settled = true;
        window.clearTimeout(kill);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve(v);
      };
      const kill = window.setTimeout(() => done("missing"), 800);
      ws.addEventListener("open", () => done("ok"));
      ws.addEventListener("error", () => done("missing"));
    });
    return state;
  } catch {
    return "unknown";
  }
}

/** Abort a stuck ethereumGetAddress / sign call so Suite can accept the next one. */
export function cancelTrezorConnect(reason = "user-cancel"): void {
  try {
    TrezorConnect.cancel(reason);
  } catch {
    /* ignore */
  }
}

/** @deprecated use probeSuite — Connect 10 path */
export const probeBridge = probeSuite;

export type SuiteChannel = "desktop" | "web-or-missing" | "unknown";

/** Desktop Suite expose connect-ws :21335; missing → use Suite Web / open Suite. */
export async function detectSuiteChannel(): Promise<SuiteChannel> {
  const s = await probeSuite();
  if (s === "ok") return "desktop";
  if (s === "missing") return "web-or-missing";
  return "unknown";
}

export type DeviceHints = {
  firmware: string | null;
  outdated: boolean;
  passphraseProtection: boolean | null;
  label: string | null;
};

/**
 * Best-effort features after Connect is warm.
 * Outdated = Connect reports outdated / major bump needed (soft warn).
 */
export async function getDeviceHints(): Promise<DeviceHints | null> {
  try {
    await ensureTrezorInit();
    const featOrNull = await Promise.race([
      TrezorConnect.getFeatures(),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 2500);
      }),
    ]);
    if (!featOrNull || !featOrNull.success || !featOrNull.payload) return null;
    const p = featOrNull.payload as {
      major_version?: number;
      minor_version?: number;
      patch_version?: number;
      outdated?: boolean;
      passphrase_protection?: boolean;
      label?: string;
    };
    const fw =
      p.major_version != null
        ? `${p.major_version}.${p.minor_version ?? 0}.${p.patch_version ?? 0}`
        : null;
    return {
      firmware: fw,
      outdated: !!p.outdated,
      passphraseProtection:
        typeof p.passphrase_protection === "boolean"
          ? p.passphrase_protection
          : null,
      label: p.label ?? null,
    };
  } catch {
    return null;
  }
}

export type ListedAccount = {
  derivationIndex: number;
  derivationPath: string;
  address: string;
};

/**
 * Pull many BIP44 addresses in one Suite Allow (bundle).
 * Call from a click. showOnTrezor false — listing ≠ device confirm.
 * Index 0 = Suite "Ethereum #1".
 */
export function listTrezorAccountsFromGesture(
  count = 12,
): Promise<{ accounts: ListedAccount[]; deviceId: string }> {
  // Soft ceiling for one-shot / fresh-address flows. Suite may get slow up high.
  const n = Math.max(1, Math.min(2000, Math.floor(count)));
  return (async () => {
    await ensureTrezorInit();

    const bundle = Array.from({ length: n }, (_, i) => ({
      path: ethAddressPath(i),
      showOnTrezor: false as const,
    }));
    const res = await TrezorConnect.ethereumGetAddress({ bundle });
    if (!res.success) {
      throw new Error(humanTrezorError(extractErr(res)));
    }

    const raw = (
      Array.isArray(res.payload) ? res.payload : [res.payload]
    ) as unknown[];
    const accounts: ListedAccount[] = [];
    for (let i = 0; i < raw.length; i++) {
      const row = raw[i] as { address?: string } | null;
      const address = row?.address;
      if (!address) continue;
      accounts.push({
        derivationIndex: i,
        derivationPath: ethAddressPath(i),
        address,
      });
    }
    if (!accounts.length) throw new Error("Trezor returned no addresses.");

    let deviceId = "trezor-default";
    try {
      const featOrNull = await Promise.race([
        TrezorConnect.getFeatures(),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 2500);
        }),
      ]);
      if (featOrNull && featOrNull.success && featOrNull.payload) {
        const p = featOrNull.payload as { device_id?: string; label?: string };
        if (p.device_id) deviceId = p.device_id;
        else if (p.label) deviceId = `label:${p.label}`;
      }
    } catch {
      /* list is enough */
    }

    return { accounts, deviceId };
  })();
}

/**
 * Call from a click. `accountIndex` = BIP44 index (0 = Suite "Ethereum #1").
 */
export function connectTrezorFromGesture(accountIndex = 0): Promise<{
  address0: string;
  derivationIndex: number;
  derivationPath: string;
  deviceId: string;
}> {
  const derivationIndex = Math.max(0, Math.floor(accountIndex));
  const derivationPath = ethAddressPath(derivationIndex);
  return (async () => {
    await ensureTrezorInit();

    const res = await TrezorConnect.ethereumGetAddress({
      path: derivationPath,
      showOnTrezor: false,
    });
    if (!res.success) {
      throw new Error(humanTrezorError(extractErr(res)));
    }
    const payload = res.payload as { address?: string };
    const address0 = payload.address;
    if (!address0) throw new Error("Trezor returned no address.");
    return {
      address0,
      derivationIndex,
      derivationPath,
      deviceId: "trezor-default",
    };
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
