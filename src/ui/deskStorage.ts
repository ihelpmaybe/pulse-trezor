/**
 * Local desk prefs / session persistence — keep out of PulseTrezor.tsx.
 */
import { isAddress, type Address } from "viem";
import {
  ACCOUNT_INDEX_MAX,
  clampAccountCount,
  parseLoadSpec,
} from "./faceFormat";
import { isRetiredRpcUrl } from "../chain/rpcErrors";
import type { ListedAccount } from "../trezor/connect";
import {
  DEFAULT_PATH_TEMPLATE,
  LEGACY_LEDGER_PATH_TEMPLATE,
  normalizePathTemplate,
  setPathTemplate,
} from "../trezor/paths";

export const WATCH_KEY = "pulse-trezor-watch-v1";
export const RPC_KEY = "pulse-trezor-rpc-v1";
export const RPC_HEALTH_MS_KEY = "pulse-perch-rpc-health-ms-v1";
/** Default 60s — public RPCs; user can slow/stop in Settings. */
export const RPC_HEALTH_MS_DEFAULT = 60_000;
export const RPC_HEALTH_MS_OPTIONS = [
  { ms: 30_000, label: "30 seconds" },
  { ms: 60_000, label: "1 minute" },
  { ms: 120_000, label: "2 minutes" },
  { ms: 300_000, label: "5 minutes" },
  { ms: 0, label: "Off (check once)" },
] as const;
export const ACCOUNT_KEY = "pulse-trezor-account-v1";
export const ACCOUNTS_KEY = "pulse-trezor-accounts-v1";
export const ACCOUNT_COUNT_KEY = "pulse-trezor-account-count-v1";
export const A11Y_KEY = "pulse-perch-a11y-v1";
export const PRIVACY_KEY = "pulse-perch-privacy-hide-v1";
export const INJECT_KEY = "pulse-perch-inject-v1";
export const THEME_KEY = "pulse-perch-theme-v1";
export const PATH_TEMPLATE_KEY = "pulse-perch-path-template-v1";
/** Device card: show Account'/Change/Count/Path when on. */
export const DEVICE_ADVANCED_KEY = "pulse-perch-device-advanced-v1";
/** One-time stronger mainnet send cue — then soft “Mainnet” line only. */
export const FIRST_MAINNET_SEND_KEY = "pulse-perch-first-mainnet-send-v1";

export type A11yPrefs = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  strongFocus: boolean;
};

export type ThemePref = "dark" | "light";

export type Session = {
  address: Address;
  derivationIndex: number;
  derivationPath: string;
  deviceId: string;
};

export const A11Y_DEFAULT: A11yPrefs = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  strongFocus: false,
};

export function loadTheme(): ThemePref {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(t: ThemePref) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

export function loadPrivacyHide(): boolean {
  try {
    return localStorage.getItem(PRIVACY_KEY) === "1";
  } catch {
    return false;
  }
}

export function savePrivacyHide(on: boolean) {
  try {
    if (on) localStorage.setItem(PRIVACY_KEY, "1");
    else localStorage.removeItem(PRIVACY_KEY);
  } catch {
    /* ignore */
  }
}

export function loadDeviceAdvanced(): boolean {
  try {
    return localStorage.getItem(DEVICE_ADVANCED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveDeviceAdvanced(on: boolean) {
  try {
    if (on) localStorage.setItem(DEVICE_ADVANCED_KEY, "1");
    else localStorage.removeItem(DEVICE_ADVANCED_KEY);
  } catch {
    /* ignore */
  }
}

export function loadA11y(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (!raw) return { ...A11Y_DEFAULT };
    return { ...A11Y_DEFAULT, ...(JSON.parse(raw) as Partial<A11yPrefs>) };
  } catch {
    return { ...A11Y_DEFAULT };
  }
}

export function saveA11y(prefs: A11yPrefs) {
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function applyA11y(prefs: A11yPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.toggleAttribute("data-a11y-large", prefs.largeText);
  root.toggleAttribute("data-a11y-contrast", prefs.highContrast);
  root.toggleAttribute("data-a11y-motion", prefs.reduceMotion);
  root.toggleAttribute("data-a11y-focus", prefs.strongFocus);
}

export function loadWatch(): Session | null {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Session;
    if (!j?.address || !isAddress(j.address)) return null;
    return j;
  } catch {
    return null;
  }
}

export function saveWatch(s: Session | null) {
  try {
    if (!s) localStorage.removeItem(WATCH_KEY);
    else localStorage.setItem(WATCH_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadAccountIndex(): number {
  try {
    const n = Number(localStorage.getItem(ACCOUNT_KEY));
    if (Number.isFinite(n) && n >= 0 && n <= ACCOUNT_INDEX_MAX)
      return Math.floor(n);
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveAccountIndex(i: number) {
  try {
    localStorage.setItem(ACCOUNT_KEY, String(Math.max(0, Math.floor(i))));
  } catch {
    /* ignore */
  }
}

export function loadAccountCount(): number {
  return loadAccountRangeSpecParsed().span;
}

export function saveAccountCount(n: number) {
  saveAccountRangeSpec(String(clampAccountCount(n)));
}

/** Count field face: `12` or `2000-3000`. */
export function loadAccountRangeSpec(): string {
  try {
    const raw = localStorage.getItem(ACCOUNT_COUNT_KEY);
    if (raw && parseLoadSpec(raw)) return raw.trim().replace(/\s+/g, "");
  } catch {
    /* ignore */
  }
  return "12";
}

export function loadAccountRangeSpecParsed(): {
  from: number;
  to: number;
  span: number;
} {
  return parseLoadSpec(loadAccountRangeSpec()) ?? { from: 0, to: 11, span: 12 };
}

export function saveAccountRangeSpec(raw: string) {
  const p = parseLoadSpec(raw);
  if (!p) return;
  try {
    const s = raw.trim().replace(/\s+/g, "");
    localStorage.setItem(ACCOUNT_COUNT_KEY, s);
  } catch {
    /* ignore */
  }
}

export function loadAccountList(): ListedAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as ListedAccount[];
    if (!Array.isArray(j)) return [];
    return j.filter(
      (a) =>
        a &&
        typeof a.derivationIndex === "number" &&
        typeof a.address === "string" &&
        isAddress(a.address),
    );
  } catch {
    return [];
  }
}

export function saveAccountList(list: ListedAccount[]) {
  try {
    if (!list.length) localStorage.removeItem(ACCOUNTS_KEY);
    else localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function loadRpcOverride(): string {
  try {
    const t = (localStorage.getItem(RPC_KEY) || "").trim();
    // Drop shut-down endpoints so failover / Official can run again.
    if (t && isRetiredRpcUrl(t)) {
      localStorage.removeItem(RPC_KEY);
      return "";
    }
    return t;
  } catch {
    return "";
  }
}

export function saveRpcOverride(url: string) {
  try {
    const t = url.trim();
    if (!t) localStorage.removeItem(RPC_KEY);
    else localStorage.setItem(RPC_KEY, t);
  } catch {
    /* ignore */
  }
}

export function loadRpcHealthMs(): number {
  try {
    const n = Number(localStorage.getItem(RPC_HEALTH_MS_KEY));
    if (
      RPC_HEALTH_MS_OPTIONS.some((o) => o.ms === n) ||
      n === RPC_HEALTH_MS_DEFAULT
    ) {
      return n;
    }
  } catch {
    /* ignore */
  }
  return RPC_HEALTH_MS_DEFAULT;
}

export function saveRpcHealthMs(ms: number) {
  try {
    localStorage.setItem(RPC_HEALTH_MS_KEY, String(ms));
  } catch {
    /* ignore */
  }
}

export function loadInjectEth(): boolean {
  try {
    return localStorage.getItem(INJECT_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveInjectEth(on: boolean) {
  try {
    localStorage.setItem(INJECT_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadFirstMainnetSendAcked(): boolean {
  try {
    return localStorage.getItem(FIRST_MAINNET_SEND_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveFirstMainnetSendAcked() {
  try {
    localStorage.setItem(FIRST_MAINNET_SEND_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Load path template into memory + return it (MetaMask BIP44 if unset/bad). */
export function loadPathTemplate(): string {
  try {
    const raw = (localStorage.getItem(PATH_TEMPLATE_KEY) || "").trim();
    const norm = (u: string) => u.replace(/\/$/, "").toLowerCase();
    // Perch = Trezor + MetaMask/Suite path. Drop leftover Ledger Live templates.
    if (raw && norm(raw) === norm(LEGACY_LEDGER_PATH_TEMPLATE)) {
      localStorage.removeItem(PATH_TEMPLATE_KEY);
      setPathTemplate(DEFAULT_PATH_TEMPLATE);
      return DEFAULT_PATH_TEMPLATE;
    }
    if (raw) {
      const n = normalizePathTemplate(raw);
      if (n.ok) {
        setPathTemplate(n.template);
        return n.template;
      }
    }
  } catch {
    /* ignore */
  }
  setPathTemplate(DEFAULT_PATH_TEMPLATE);
  return DEFAULT_PATH_TEMPLATE;
}

export function savePathTemplate(template: string): string {
  const n = normalizePathTemplate(template);
  if (!n.ok) throw new Error(n.error);
  setPathTemplate(n.template);
  try {
    if (n.template === DEFAULT_PATH_TEMPLATE) {
      localStorage.removeItem(PATH_TEMPLATE_KEY);
    } else {
      localStorage.setItem(PATH_TEMPLATE_KEY, n.template);
    }
  } catch {
    /* ignore */
  }
  return n.template;
}
