/**
 * Real @trezor/connect-web v10 → Trezor Suite (Desktop WS or Suite Web popup).
 * Seed never enters this app. Device wire is owned by Suite — not legacy Bridge :21325.
 * Suite Desktop uses localhost WS (not a browser popup), so we may await init
 * inside the click handler before ethereumGetAddress.
 */
import TrezorConnectImport, { DEVICE } from "@trezor/connect-web";
import { ACCOUNT_COUNT_MAX, ACCOUNT_INDEX_MAX } from "../ui/faceFormat";
import { humanTrezorError, messageFromTrezorPayload } from "./errors";
import { ethAddressPath } from "./paths";

export { humanTrezorError, messageFromTrezorPayload };

/** connect-web re-exports TRANSPORT_EVENT but not TRANSPORT enum — string forms. */
const TRANSPORT_START = "transport-start";
const TRANSPORT_ERROR = "transport-error";

type ConnectApi = typeof TrezorConnectImport;

/** Connect v10 event bus — typed API omits `on` in some connect-common builds. */
type ConnectWithEvents = ConnectApi & {
  on: (event: string, cb: (event: unknown) => void) => void;
  off?: (event: string, cb?: (event: unknown) => void) => void;
};

/**
 * Boltz + MetaMask keyring unwrap: CJS `{ default: singleton }` vs ESM
 * `module.default.default`. Prefer the object that has ethereumGetAddress.
 * Use `unknown` so the type-predicate doesn't narrow the whole mod to `never`.
 */
function unwrapConnect(mod: unknown): ConnectApi {
  const hasAddr = (x: unknown): x is ConnectApi =>
    !!x && typeof x === "object" && "ethereumGetAddress" in x;

  if (hasAddr(mod)) return mod;
  const nest = mod as { default?: unknown };
  const d1 = nest.default;
  // MM: native ESM nests singleton at .default.default
  if (d1 && typeof d1 === "object" && d1 !== null && "default" in d1) {
    const d2 = (d1 as { default?: unknown }).default;
    if (hasAddr(d2)) return d2;
  }
  if (hasAddr(d1)) return d1;
  return mod as ConnectApi;
}

const TrezorConnect = unwrapConnect(TrezorConnectImport) as ConnectWithEvents;

let initDone = false;
let initPromise: Promise<void> | null = null;
/** MM keyring DELAY_BETWEEN_POPUPS — gap after fresh init before next Suite call. */
let lastInitAt = 0;
const SUITE_POPUP_GAP_MS = 1000;

/**
 * Concurrent Connect/Load clicks share one Suite pubkey export (Rabby Connect 10
 * unlock-share pattern) so closing Suite once doesn't reopen for a duplicate call.
 */
const addressFlights = new Map<string, Promise<unknown>>();

/** Serialize all HW Suite calls (Taho: one device op at a time; UI is untrusted). */
let hwTail: Promise<unknown> = Promise.resolve();

/**
 * MetaMask eth-trezor-keyring: wait ~1s after unlock/init before the next
 * Suite popup so Allow + sign do not race.
 */
export async function suitePopupGap(): Promise<void> {
  if (!lastInitAt) return;
  const elapsed = Date.now() - lastInitAt;
  if (elapsed >= SUITE_POPUP_GAP_MS) return;
  await new Promise<void>((r) => {
    window.setTimeout(r, SUITE_POPUP_GAP_MS - elapsed);
  });
}

export function enqueueHw<T>(fn: () => Promise<T>): Promise<T> {
  const run = hwTail.then(async () => {
    await suitePopupGap();
    return fn();
  }, async () => {
    await suitePopupGap();
    return fn();
  });
  hwTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function shareFlight<T>(key: string, start: () => Promise<T>): Promise<T> {
  const existing = addressFlights.get(key);
  if (existing) return existing as Promise<T>;
  const p = enqueueHw(start).finally(() => {
    if (addressFlights.get(key) === p) addressFlights.delete(key);
  });
  addressFlights.set(key, p);
  return p;
}

function clearAddressFlights(): void {
  addressFlights.clear();
}

/** Suite permission prompt icon (~64px circle). Absolute URL required. */
export function connectAppIconUrl(origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:5174");
  return `${base.replace(/\/$/, "")}/icons/icon-192.png`;
}

export function isTrezorInited(): boolean {
  return initDone;
}

/** After Cancel/HMR, Connect can report "not initialized" while our flag is still true. */
export function resetTrezorInit(): void {
  initDone = false;
  initPromise = null;
  lastInitAt = 0;
  clearAddressFlights();
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
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://127.0.0.1:5174";
      // Connect 10: no connectSrc / transports / iframe Bridge — Suite hosts core.
      await TrezorConnect.init({
        // Prefer Suite Desktop WS; fall back to Suite Web popup only if desktop missing.
        coreMode: "auto",
        manifest: {
          appName: "Pulse Perch",
          appUrl: origin,
          appIcon: connectAppIconUrl(origin),
          email: "pulse-perch@localhost",
        },
      });
      bindDeviceEvents();
      initDone = true;
      lastInitAt = Date.now();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already\s*initialized/i.test(msg)) {
        initDone = true;
        lastInitAt = Date.now();
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

/**
 * Abort a stuck Connect call so Suite can accept the next one.
 * This is a Perch “stop waiting” — not a device reject (Taho law).
 */
export function cancelTrezorConnect(reason = "user-cancel"): void {
  clearAddressFlights();
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
  /** Ambire DEVICE_EVENT: model name without “Trezor ” prefix when known. */
  model: string | null;
  deviceId: string | null;
  /**
   * Official connect-examples (electron): DEVICE.CONNECT_UNACQUIRED —
   * device present but session held elsewhere / after refresh.
   */
  unacquired: boolean;
  /** Official TRANSPORT_EVENT — soft cue when Suite/bridge transport fails. */
  transportError: string | null;
};

/** Last DEVICE_EVENT identity (Ambire TrezorController pattern). */
let lastDeviceModel: string | null = null;
let lastDeviceId: string | null = null;
/** Official electron example: unacquired / transport cues. */
let deviceUnacquired = false;
let lastTransportError: string | null = null;
let deviceEventBound = false;

function bindDeviceEvents(): void {
  if (deviceEventBound) return;
  deviceEventBound = true;
  try {
    (TrezorConnect as ConnectWithEvents).on("DEVICE_EVENT", (event: unknown) => {
      const ev = event as {
        type?: string;
        payload?: {
          name?: string;
          id?: string;
          type?: string;
          features?: { model?: string; device_id?: string };
        };
      };
      const payload = ev?.payload;
      // MM keyring: model from features on DEVICE.CONNECT
      const featModel = payload?.features?.model;
      if (featModel) {
        lastDeviceModel = String(featModel).replace(/^Trezor\s*/i, "").trim() || null;
      } else if (payload?.name) {
        lastDeviceModel = payload.name.replace(/^Trezor\s*/i, "").trim() || null;
      }
      if (payload?.features?.device_id) {
        lastDeviceId = String(payload.features.device_id);
      } else if (payload?.id) {
        lastDeviceId = String(payload.id);
      }

      // Official electron: CONNECT_UNACQUIRED → show Acquire (getFeatures).
      const t = ev?.type || payload?.type;
      if (t === DEVICE.CONNECT_UNACQUIRED) {
        deviceUnacquired = true;
      } else if (t === DEVICE.CONNECT || t === DEVICE.CHANGED) {
        deviceUnacquired = false;
      } else if (t === DEVICE.DISCONNECT) {
        deviceUnacquired = false;
        lastDeviceId = null;
      }
    });
  } catch {
    /* ignore */
  }
  try {
    // Official node + electron examples: TRANSPORT_EVENT.
    (TrezorConnect as ConnectWithEvents).on("TRANSPORT_EVENT", (event: unknown) => {
      const ev = event as { type?: string; payload?: { error?: string } };
      if (ev?.type === TRANSPORT_ERROR) {
        lastTransportError =
          ev.payload?.error ||
          "Suite / transport missing — open Suite Desktop or Suite Web";
      } else if (ev?.type === TRANSPORT_START) {
        lastTransportError = null;
      }
    });
  } catch {
    /* ignore */
  }
}

/**
 * Official connect-examples: after CONNECT_UNACQUIRED, call getFeatures to
 * take the session. Soft — never invents a parallel Bridge path.
 */
export async function acquireTrezorDevice(): Promise<boolean> {
  try {
    await ensureTrezorInit();
    const res = await TrezorConnect.getFeatures();
    if (res.success) {
      deviceUnacquired = false;
      lastTransportError = null;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

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
    if (!featOrNull || !featOrNull.success || !featOrNull.payload) {
      if (deviceUnacquired || lastTransportError) {
        return {
          firmware: null,
          outdated: false,
          passphraseProtection: null,
          label: null,
          model: lastDeviceModel,
          deviceId: lastDeviceId,
          unacquired: deviceUnacquired,
          transportError: lastTransportError,
        };
      }
      return null;
    }
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
      model: lastDeviceModel,
      deviceId: lastDeviceId,
      unacquired: deviceUnacquired,
      transportError: lastTransportError,
    };
  } catch {
    if (deviceUnacquired || lastTransportError) {
      return {
        firmware: null,
        outdated: false,
        passphraseProtection: null,
        label: null,
        model: lastDeviceModel,
        deviceId: lastDeviceId,
        unacquired: deviceUnacquired,
        transportError: lastTransportError,
      };
    }
    return null;
  }
}

export type ListedAccount = {
  derivationIndex: number;
  derivationPath: string;
  address: string;
};

/**
 * Pull BIP44 addresses in one Suite Allow (bundle).
 * Call from a click. showOnTrezor false — listing ≠ device confirm.
 * Index 0 = Suite "Ethereum #1". `fromIndex` = first slot (inclusive).
 */
export function listTrezorAccountsFromGesture(
  count = 12,
  fromIndex = 0,
): Promise<{ accounts: ListedAccount[]; deviceId: string }> {
  const from = Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Math.floor(fromIndex)));
  const n = Math.max(1, Math.min(ACCOUNT_COUNT_MAX, Math.floor(count)));
  const last = Math.min(from + n - 1, ACCOUNT_INDEX_MAX);
  const span = last - from + 1;
  /** Suite bundles stay chunked so huge Count doesn’t one-shot OOM. */
  const CHUNK = 250;
  const flightKey = `list:${from}:${span}:${ethAddressPath(from)}`;
  return shareFlight(flightKey, async () => {
    await ensureTrezorInit();

    const accounts: ListedAccount[] = [];
    for (let offset = 0; offset < span; offset += CHUNK) {
      const chunkLen = Math.min(CHUNK, span - offset);
      const base = from + offset;
      const bundle = Array.from({ length: chunkLen }, (_, i) => ({
        path: ethAddressPath(base + i),
        showOnTrezor: false as const,
      }));
      const res = await TrezorConnect.ethereumGetAddress({ bundle });
      if (!res.success) {
        throw new Error(humanTrezorError(extractErr(res)));
      }
      const raw = (
        Array.isArray(res.payload) ? res.payload : [res.payload]
      ) as unknown[];
      for (let i = 0; i < raw.length; i++) {
        const row = raw[i] as { address?: string } | null;
        const address = row?.address;
        if (!address) continue;
        const derivationIndex = base + i;
        accounts.push({
          derivationIndex,
          derivationPath: ethAddressPath(derivationIndex),
          address,
        });
      }
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
  });
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
  return shareFlight(`addr:${derivationPath}`, async () => {
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
  });
}

function extractErr(res: unknown): string {
  const fail = res as {
    payload?: { error?: string; code?: string };
    error?: { message?: string } | string;
  };
  if (fail.payload && (fail.payload.error || fail.payload.code)) {
    return messageFromTrezorPayload(fail.payload);
  }
  const raw =
    (typeof fail.error === "string" ? fail.error : fail.error?.message) ||
    "Trezor not available";
  return humanTrezorError(raw);
}

export { TrezorConnect };
