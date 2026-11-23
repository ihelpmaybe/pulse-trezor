/**
 * SYNC1 watch-only registry import — reject seed-like fields hard.
 * Spec: pulse-trezor-platform/SYNC1-watch-registry.md
 */
import type { Address } from "viem";
import { isAddress } from "viem";
import { upsertAddressBook } from "./addressBook";
import { ethAddressPath, SCHEME_ID } from "../trezor/paths";

const SEEDISH =
  /\b(mnemonic|seed|private[_\s-]?key|privkey|secret[_\s-]?key|bip39|xprv|xpriv|passphrase|extendedPrivateKey)\b/i;

const FORBIDDEN_KEYS = new Set(
  [
    "mnemonic",
    "seed",
    "privatekey",
    "private_key",
    "privkey",
    "xprv",
    "xpriv",
    "extendedprivatekey",
    "passphrase",
    "bip39",
    "secret_key",
    "secretkey",
    "phrase",
  ].map((s) => s.toLowerCase()),
);

export type WatchAccount = {
  address: Address;
  derivationIndex?: number;
  derivationPath?: string;
  schemeId?: string;
  label?: string;
};

export type WatchImportResult = {
  ok: boolean;
  accounts: WatchAccount[];
  bookAdded: number;
  kind?: string;
  chainId?: number;
  schemeId?: string;
  walletFingerprint?: string;
  error?: string;
};

export function looksLikeSeedPayload(raw: string): boolean {
  if (SEEDISH.test(raw)) return true;
  const words = raw.trim().split(/\s+/);
  if (
    words.length >= 12 &&
    words.length <= 24 &&
    words.every((w) => /^[a-z]+$/i.test(w))
  ) {
    return true;
  }
  return false;
}

function assertNoSecretKeys(
  value: unknown,
  path = "root",
): string | null {
  if (value == null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = assertNoSecretKeys(value[i], `${path}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lower = k.toLowerCase().replace(/-/g, "_");
    if (FORBIDDEN_KEYS.has(lower) || lower.includes("xprv")) {
      return `Rejected field "${path}.${k}" — seed-like keys not allowed.`;
    }
    if (typeof v === "string" && SEEDISH.test(v)) {
      return `Rejected secret-looking value at ${path}.${k}.`;
    }
    const nested = assertNoSecretKeys(v, `${path}.${k}`);
    if (nested) return nested;
  }
  return null;
}

function rowToAccount(row: Record<string, unknown>): WatchAccount | null {
  const addr = String(row.address || "");
  if (!isAddress(addr)) return null;
  const indexRaw = row.index ?? row.derivationIndex;
  const derivationIndex =
    typeof indexRaw === "number" && Number.isFinite(indexRaw)
      ? Math.max(0, Math.floor(indexRaw))
      : undefined;
  const derivationPath =
    typeof row.derivationPath === "string"
      ? row.derivationPath
      : typeof row.path === "string"
        ? row.path
        : derivationIndex != null
          ? ethAddressPath(derivationIndex)
          : undefined;
  const schemeId =
    typeof row.schemeId === "string" ? row.schemeId : undefined;
  const label = typeof row.label === "string" ? row.label : undefined;
  return {
    address: addr as Address,
    derivationIndex,
    derivationPath,
    schemeId,
    label,
  };
}

export function parseWatchImportJson(text: string): WatchImportResult {
  if (looksLikeSeedPayload(text)) {
    return {
      ok: false,
      accounts: [],
      bookAdded: 0,
      error:
        "Rejected — looks like a seed / private key payload. Never import those.",
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, accounts: [], bookAdded: 0, error: "Invalid JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, accounts: [], bookAdded: 0, error: "Expected an object." };
  }
  const secretErr = assertNoSecretKeys(parsed);
  if (secretErr) {
    return { ok: false, accounts: [], bookAdded: 0, error: secretErr };
  }

  const obj = parsed as Record<string, unknown>;
  const kind = typeof obj.kind === "string" ? obj.kind : undefined;
  if (
    kind &&
    kind !== "pulse-watch-registry" &&
    kind !== "pulse-perch-watch"
  ) {
    return {
      ok: false,
      accounts: [],
      bookAdded: 0,
      error: `Unknown kind "${kind}" — expected pulse-watch-registry.`,
    };
  }
  if (obj.version != null && obj.version !== 1) {
    return {
      ok: false,
      accounts: [],
      bookAdded: 0,
      error: `Unsupported registry version: ${String(obj.version)}`,
    };
  }

  const accounts: WatchAccount[] = [];
  const seen = new Set<string>();
  const push = (a: WatchAccount | null) => {
    if (!a) return;
    const key = a.address.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    accounts.push(a);
  };

  if (Array.isArray(obj.accounts)) {
    for (const row of obj.accounts) {
      if (!row || typeof row !== "object") continue;
      push(rowToAccount(row as Record<string, unknown>));
    }
  }
  if (obj.watch && typeof obj.watch === "object") {
    push(rowToAccount(obj.watch as Record<string, unknown>));
  }

  let bookAdded = 0;
  const book = obj.addressBook;
  if (Array.isArray(book)) {
    for (const row of book) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const addr = String(r.address || "");
      const label = String(r.label || "");
      if (!isAddress(addr)) continue;
      upsertAddressBook(addr, label || addr.slice(0, 10));
      bookAdded += 1;
    }
  }

  if (!accounts.length && !bookAdded) {
    return {
      ok: false,
      accounts: [],
      bookAdded: 0,
      error: "No addresses or book entries found.",
    };
  }

  return {
    ok: true,
    accounts,
    bookAdded,
    kind: kind || "pulse-watch-registry",
    chainId: typeof obj.chainId === "number" ? obj.chainId : undefined,
    schemeId:
      typeof obj.schemeId === "string" ? obj.schemeId : SCHEME_ID,
    walletFingerprint:
      typeof obj.walletFingerprint === "string"
        ? obj.walletFingerprint
        : undefined,
  };
}

/** Build SYNC1 export document (Desk). */
export function buildWatchRegistryExport(opts: {
  accounts: {
    address: string;
    derivationIndex: number;
    derivationPath?: string;
  }[];
  watch?: { address: string; derivationIndex: number } | null;
  addressBook?: { address: string; label: string }[];
  chainId: number;
  walletFingerprint: string;
  notes?: string;
}): Record<string, unknown> {
  const schemeId = SCHEME_ID;
  const accounts = opts.accounts.map((a) => ({
    address: a.address,
    index: a.derivationIndex,
    derivationPath: a.derivationPath || ethAddressPath(a.derivationIndex),
    schemeId,
  }));
  const highestIndexSeen =
    accounts.length === 0
      ? -1
      : Math.max(...accounts.map((a) => a.index));
  return {
    kind: "pulse-watch-registry",
    version: 1,
    schemeId,
    chainId: opts.chainId === 943 ? 943 : 369,
    walletFingerprint: opts.walletFingerprint || "watch",
    highestIndexSeen,
    exportedAt: new Date().toISOString(),
    notes: opts.notes,
    accounts,
    watch: opts.watch
      ? {
          address: opts.watch.address,
          index: opts.watch.derivationIndex,
          derivationPath: ethAddressPath(opts.watch.derivationIndex),
          schemeId,
        }
      : null,
    addressBook: opts.addressBook ?? [],
  };
}
