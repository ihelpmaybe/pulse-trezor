/**
 * Per-wallet notes — local only, no keys.
 */
import type { Address } from "viem";

const KEY = "pulse-perch-account-notes-v1";
const NOTE_MAX = 280;

type Store = Record<string, string>;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Store;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadAccountNotes(): Store {
  return load();
}

export function getAccountNote(address: string): string | null {
  const n = load()[address.toLowerCase()];
  return n && n.trim() ? n : null;
}

export function setAccountNote(
  address: Address | string,
  note: string | null,
): Store {
  const s = load();
  const a = address.toLowerCase();
  const t = (note ?? "").trim().slice(0, NOTE_MAX);
  if (!t) delete s[a];
  else s[a] = t;
  save(s);
  return s;
}

export const ACCOUNT_NOTE_MAX = NOTE_MAX;
