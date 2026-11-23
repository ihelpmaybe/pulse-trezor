/**
 * Import watch / address-book JSON — reject seed-like fields hard.
 */
import type { Address } from "viem";
import { isAddress } from "viem";
import { upsertAddressBook } from "./addressBook";

const SEEDISH =
  /\b(mnemonic|seed|private[_\s-]?key|privkey|secret[_\s-]?key|bip39|xprv|xpub)\b/i;

export type WatchImportResult = {
  ok: boolean;
  accounts: { address: Address; derivationIndex?: number }[];
  bookAdded: number;
  error?: string;
};

export function looksLikeSeedPayload(raw: string): boolean {
  if (SEEDISH.test(raw)) return true;
  // 12+ word mnemonic-ish blob
  const words = raw.trim().split(/\s+/);
  if (words.length >= 12 && words.length <= 24 && words.every((w) => /^[a-z]+$/i.test(w))) {
    return true;
  }
  return false;
}

export function parseWatchImportJson(text: string): WatchImportResult {
  if (looksLikeSeedPayload(text)) {
    return {
      ok: false,
      accounts: [],
      bookAdded: 0,
      error: "Rejected — looks like a seed / private key payload. Never import those.",
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
  const obj = parsed as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (SEEDISH.test(k)) {
      return {
        ok: false,
        accounts: [],
        bookAdded: 0,
        error: `Rejected field "${k}" — seed-like keys not allowed.`,
      };
    }
  }

  const accounts: { address: Address; derivationIndex?: number }[] = [];
  const accRaw = obj.accounts;
  if (Array.isArray(accRaw)) {
    for (const row of accRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const addr = String(r.address || "");
      if (!isAddress(addr)) continue;
      const di =
        typeof r.derivationIndex === "number" ? r.derivationIndex : undefined;
      accounts.push({ address: addr as Address, derivationIndex: di });
    }
  }
  if (obj.watch && typeof obj.watch === "object") {
    const w = obj.watch as Record<string, unknown>;
    const addr = String(w.address || "");
    if (isAddress(addr)) {
      accounts.push({
        address: addr as Address,
        derivationIndex:
          typeof w.derivationIndex === "number" ? w.derivationIndex : undefined,
      });
    }
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
  return { ok: true, accounts, bookAdded };
}
