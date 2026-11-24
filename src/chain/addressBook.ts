/**
 * Local address book — labels + “new recipient” warn. No keys.
 */
import type { Address } from "viem";

const KEY = "pulse-perch-address-book-v1";

export type BookEntry = {
  address: Address;
  label: string;
  addedAt: string;
};

function loadRaw(): BookEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as BookEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRaw(rows: BookEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function loadAddressBook(): BookEntry[] {
  return loadRaw().sort((a, b) => a.label.localeCompare(b.label));
}

export function upsertAddressBook(address: string, label: string): BookEntry[] {
  const addr = address.trim() as Address;
  const lab = label.trim() || short(addr);
  const rows = loadRaw().filter(
    (r) => r.address.toLowerCase() !== addr.toLowerCase(),
  );
  rows.push({
    address: addr,
    label: lab.slice(0, 48),
    addedAt: new Date().toISOString(),
  });
  saveRaw(rows);
  return loadAddressBook();
}

export function removeAddressBook(address: string): BookEntry[] {
  const rows = loadRaw().filter(
    (r) => r.address.toLowerCase() !== address.toLowerCase(),
  );
  saveRaw(rows);
  return loadAddressBook();
}

export function bookLabel(address: string): string | null {
  const hit = loadRaw().find(
    (r) => r.address.toLowerCase() === address.toLowerCase(),
  );
  return hit?.label ?? null;
}

export function isKnownRecipient(address: string): boolean {
  return bookLabel(address) != null;
}

export type LookalikeHit = { label: string; known: string };

/**
 * Same start+end, different middle — classic clipboard / history poison.
 */
export function lookalikeAgainst(
  address: string,
  peers: readonly { address: string; label: string }[],
): LookalikeHit | null {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) return null;
  const head = a.slice(0, 6);
  const tail = a.slice(-4);
  for (const b of peers) {
    const k = b.address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(k) || k === a) continue;
    if (k.slice(0, 6) === head && k.slice(-4) === tail) {
      return { label: b.label || short(k), known: b.address };
    }
  }
  return null;
}

/**
 * Clipboard / UI poisoning vs saved contacts.
 */
export function lookalikePoison(
  address: string,
  book: BookEntry[] = loadRaw(),
): LookalikeHit | null {
  return lookalikeAgainst(
    address,
    book.map((b) => ({ address: b.address, label: b.label })),
  );
}

/**
 * Peers for send-face poison: address book + prior Out counterparties
 * (history is where dust twins get planted).
 */
export function sendPoisonPeers(
  book: BookEntry[] = loadRaw(),
  activity: readonly {
    direction: string;
    counterparty: string | null;
  }[] = [],
): { address: string; label: string }[] {
  const peers: { address: string; label: string }[] = book.map((b) => ({
    address: b.address,
    label: b.label,
  }));
  const seen = new Set(peers.map((p) => p.address.toLowerCase()));
  for (const row of activity) {
    if (row.direction !== "out" || !row.counterparty) continue;
    const a = row.counterparty.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a) || seen.has(a)) continue;
    seen.add(a);
    peers.push({
      address: row.counterparty,
      label: bookLabel(row.counterparty) || short(a),
    });
  }
  return peers;
}

/** Send confirm: lookalike vs book + prior outs. */
export function sendLookalikePoison(
  address: string,
  book: BookEntry[] = loadRaw(),
  activity: readonly {
    direction: string;
    counterparty: string | null;
  }[] = [],
): LookalikeHit | null {
  return lookalikeAgainst(address, sendPoisonPeers(book, activity));
}

/** Tiny inbound used to plant a lookalike in history (PLS / native). */
export const POISON_DUST_ETH = 0.05;

export type ActivityPoisonHit = LookalikeHit & {
  dust: boolean;
  direction: "in" | "out";
};

/**
 * Flag activity rows that look like address-poisoning theater:
 * lookalike of a book contact or a prior Out counterparty (esp. tiny In).
 */
export function activityPoison(
  row: {
    direction: string;
    valueEth: string;
    counterparty: string | null;
  },
  peers: readonly { address: string; label: string }[],
  dustEth = POISON_DUST_ETH,
): ActivityPoisonHit | null {
  if (
    (row.direction !== "in" && row.direction !== "out") ||
    !row.counterparty
  ) {
    return null;
  }
  const hit = lookalikeAgainst(row.counterparty, peers);
  if (!hit) return null;
  const v = Number(row.valueEth);
  const dust =
    row.direction === "in" &&
    Number.isFinite(v) &&
    v >= 0 &&
    v <= dustEth;
  return {
    ...hit,
    dust,
    direction: row.direction,
  };
}

function short(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
