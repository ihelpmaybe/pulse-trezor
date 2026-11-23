/**
 * Per-origin WC permission memory — soft gate for repeat peers.
 */
const KEY = "pulse-perch-wc-origins-v1";

export type OriginPerm = {
  origin: string;
  allowed: boolean;
  lastSeen: string;
};

function load(): OriginPerm[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const a = JSON.parse(raw) as OriginPerm[];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function save(rows: OriginPerm[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

export function rememberOrigin(origin: string, allowed: boolean): void {
  const o = (origin || "").trim() || "(unknown)";
  const rows = load().filter((r) => r.origin !== o);
  rows.unshift({
    origin: o,
    allowed,
    lastSeen: new Date().toISOString(),
  });
  save(rows);
}

export function originAllowed(origin: string): boolean | null {
  const o = (origin || "").trim() || "(unknown)";
  const hit = load().find((r) => r.origin === o);
  if (!hit) return null;
  return hit.allowed;
}

export function listOrigins(): OriginPerm[] {
  return load();
}
