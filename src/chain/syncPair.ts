/**
 * SYNC2 — QR / deep-link wrap of SYNC1 watch registry.
 * Spec: pulse-trezor-platform/SYNC2-watch-pair.md
 */
import {
  buildWatchRegistryExport,
  parseWatchImportJson,
  type WatchImportResult,
} from "./watchImport";

const QR_ACCOUNT_CAP = 12;
const PREFIX_SCHEME = "web+pulseperch://sync/v1/";
const PREFIX_QUERY = "v1.";

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** Compact SYNC1 JSON for QR (≤12 accounts). */
export function compactWatchRegistry(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const accounts = Array.isArray(doc.accounts) ? doc.accounts : [];
  const sliced = accounts.slice(0, QR_ACCOUNT_CAP);
  const out: Record<string, unknown> = {
    kind: "pulse-watch-registry",
    version: 1,
    schemeId: doc.schemeId ?? "pqq-metamask-bip44-v1",
    chainId: doc.chainId ?? 369,
    walletFingerprint: doc.walletFingerprint ?? "watch",
    highestIndexSeen:
      typeof doc.highestIndexSeen === "number"
        ? doc.highestIndexSeen
        : sliced.length
          ? Math.max(
              ...sliced.map((a) => {
                const r = a as Record<string, unknown>;
                const i = r.index ?? r.derivationIndex ?? 0;
                return typeof i === "number" ? i : 0;
              }),
            )
          : -1,
    exportedAt: doc.exportedAt ?? new Date().toISOString(),
    accounts: sliced,
  };
  if (doc.watch && typeof doc.watch === "object") {
    out.watch = doc.watch;
  }
  return out;
}

export function encodeSyncUri(doc: Record<string, unknown>): string {
  const compact = compactWatchRegistry(doc);
  const raw = JSON.stringify(compact);
  return PREFIX_SCHEME + bytesToBase64Url(utf8Encode(raw));
}

export function encodeSyncQueryParam(doc: Record<string, unknown>): string {
  const compact = compactWatchRegistry(doc);
  return PREFIX_QUERY + bytesToBase64Url(utf8Encode(JSON.stringify(compact)));
}

export type SyncDecodeResult =
  | { ok: true; uriKind: "scheme" | "query" | "json"; import: WatchImportResult }
  | { ok: false; error: string };

export function decodeSyncPayload(rawIn: string): SyncDecodeResult {
  const raw = rawIn.trim();
  if (!raw) return { ok: false, error: "Empty sync payload." };

  // Full JSON paste
  if (raw.startsWith("{")) {
    const imp = parseWatchImportJson(raw);
    if (!imp.ok) return { ok: false, error: imp.error || "Invalid registry." };
    return { ok: true, uriKind: "json", import: imp };
  }

  let b64: string | null = null;
  let uriKind: "scheme" | "query" = "scheme";

  const lower = raw.toLowerCase();
  if (lower.includes("web+pulseperch://sync/v1/")) {
    const idx = lower.indexOf("web+pulseperch://sync/v1/");
    b64 = raw.slice(idx + "web+pulseperch://sync/v1/".length).split(/[&#\s]/)[0] || "";
    uriKind = "scheme";
  } else if (/^v1\./i.test(raw)) {
    b64 = raw.slice(3);
    uriKind = "query";
  } else {
    try {
      const u = new URL(raw, "http://local");
      const sync = u.searchParams.get("sync");
      if (sync) {
        if (/^v1\./i.test(sync)) b64 = sync.slice(3);
        else b64 = sync;
        uriKind = "query";
      }
    } catch {
      /* */
    }
  }

  if (!b64) {
    return {
      ok: false,
      error: "Not a sync URI — expect web+pulseperch://sync/v1/… or ?sync=v1.…",
    };
  }

  try {
    const json = utf8Decode(base64UrlToBytes(b64));
    const imp = parseWatchImportJson(json);
    if (!imp.ok) return { ok: false, error: imp.error || "Invalid registry in URI." };
    return { ok: true, uriKind, import: imp };
  } catch {
    return { ok: false, error: "Could not decode sync payload." };
  }
}

export function buildSyncUriFromAccounts(opts: {
  accounts: {
    address: string;
    derivationIndex: number;
    derivationPath?: string;
  }[];
  watch?: { address: string; derivationIndex: number } | null;
  chainId: number;
  walletFingerprint: string;
}): string {
  const doc = buildWatchRegistryExport({
    accounts: opts.accounts,
    watch: opts.watch ?? null,
    addressBook: [],
    chainId: opts.chainId,
    walletFingerprint: opts.walletFingerprint,
  });
  return encodeSyncUri(doc);
}

export const SYNC_QR_ACCOUNT_CAP = QR_ACCOUNT_CAP;
