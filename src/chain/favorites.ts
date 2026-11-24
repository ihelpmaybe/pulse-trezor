/**
 * Token + wallet favorites / watchlist — local only.
 */
import type { Address } from "viem";
import type { DeskChainId } from "./client";

const KEY = "pulse-perch-token-favs-v1";
/** HD account stars — not chain-scoped (same addresses across nets). */
const WALLET_KEY = "pulse-perch-wallet-favs-v1";

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

export function loadWalletFavorites(): string[] {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j
      .filter((a): a is string => typeof a === "string")
      .map((a) => a.toLowerCase());
  } catch {
    return [];
  }
}

export function isWalletFavorite(address: string): boolean {
  return loadWalletFavorites().includes(address.toLowerCase());
}

function saveWalletFavorites(next: string[]): string[] {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function toggleWalletFavorite(address: Address | string): string[] {
  const list = new Set(loadWalletFavorites());
  const a = address.toLowerCase();
  if (list.has(a)) list.delete(a);
  else list.add(a);
  return saveWalletFavorites([...list]);
}

export function addWalletFavorite(address: Address | string): string[] {
  const list = new Set(loadWalletFavorites());
  list.add(address.toLowerCase());
  return saveWalletFavorites([...list]);
}

export function removeWalletFavorite(address: Address | string): string[] {
  const list = new Set(loadWalletFavorites());
  list.delete(address.toLowerCase());
  return saveWalletFavorites([...list]);
}
