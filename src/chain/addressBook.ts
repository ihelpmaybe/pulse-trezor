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

function short(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
