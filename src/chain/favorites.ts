/**
 * Token favorites / watchlist — local only.
 */
import type { Address } from "viem";
import type { DeskChainId } from "./client";

const KEY = "pulse-perch-token-favs-v1";

type Store = Record<string, string[]>; // chainId → addresses lowercase

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

export function loadFavorites(chainId: DeskChainId): string[] {
  return load()[String(chainId)] ?? [];
}

export function isFavorite(chainId: DeskChainId, address: string): boolean {
  return loadFavorites(chainId).includes(address.toLowerCase());
}

export function toggleFavorite(
  chainId: DeskChainId,
  address: Address | string,
): string[] {
  const s = load();
  const k = String(chainId);
  const list = new Set(s[k] ?? []);
  const a = address.toLowerCase();
  if (list.has(a)) list.delete(a);
  else list.add(a);
  s[k] = [...list];
  save(s);
  return s[k];
}
