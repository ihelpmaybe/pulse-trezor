/**
 * Per-wallet visual marks (shape + color) — local only.
 */
import type { Address } from "viem";

export const ACCOUNT_MARK_SHAPES = [
  "circle",
  "square",
  "diamond",
  "triangle",
  "hex",
  "star",
] as const;

export const ACCOUNT_MARK_COLORS = [
  { id: "lime", hex: "#b4ff50" },
  { id: "cyan", hex: "#3de0c7" },
  { id: "amber", hex: "#f0b429" },
  { id: "coral", hex: "#ff6b4a" },
  { id: "violet", hex: "#a78bfa" },
  { id: "sky", hex: "#5bb8ff" },
  { id: "rose", hex: "#ff3178" },
  { id: "mint", hex: "#7dffb3" },
] as const;

export type AccountMarkShape = (typeof ACCOUNT_MARK_SHAPES)[number];
export type AccountMarkColorId = (typeof ACCOUNT_MARK_COLORS)[number]["id"];

export type AccountMark = {
  shape: AccountMarkShape;
  color: AccountMarkColorId;
};

const KEY = "pulse-perch-account-marks-v1";

type Store = Record<string, AccountMark>;

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

export function loadAccountMarks(): Store {
  return load();
}

export function getAccountMark(address: string): AccountMark | null {
  const m = load()[address.toLowerCase()];
  if (!m) return null;
  if (!ACCOUNT_MARK_SHAPES.includes(m.shape)) return null;
  if (!ACCOUNT_MARK_COLORS.some((c) => c.id === m.color)) return null;
  return m;
}

export function setAccountMark(
  address: Address | string,
  mark: AccountMark | null,
): Store {
  const s = load();
  const a = address.toLowerCase();
  if (!mark) delete s[a];
  else s[a] = mark;
  save(s);
  return s;
}

export function markColorHex(color: AccountMarkColorId): string {
  return ACCOUNT_MARK_COLORS.find((c) => c.id === color)?.hex ?? "#b4ff50";
}
