/**
 * SYNC0 / pqq-metamask-bip44-v1 (default)
 * MetaMask / Suite Ethereum #N: m/44'/60'/0'/0/{i} — {i}=0 → Account #1
 * Ledger Live / Suite account': m/44'/60'/{i}'/0/0
 */
export const SCHEME_ID = "pqq-metamask-bip44-v1" as const;

/** Placeholder for the account index in a template. */
export const PATH_INDEX_TOKEN = "{i}" as const;

export const DEFAULT_PATH_TEMPLATE = "m/44'/60'/0'/0/{i}" as const;

/** Perch is MetaMask / Suite Ethereum path only (Trezor users). */
export type PathPresetId = "metamask" | "custom";

export const PATH_PRESETS: {
  id: PathPresetId;
  label: string;
  template: string;
}[] = [
  {
    id: "metamask",
    label: "MetaMask / Suite Ethereum",
    template: DEFAULT_PATH_TEMPLATE,
  },
  { id: "custom", label: "Custom", template: DEFAULT_PATH_TEMPLATE },
];

/** Old Ledger Live layout — auto-cleared; not a Perch target. */
export const LEGACY_LEDGER_PATH_TEMPLATE = "m/44'/60'/{i}'/0/0";

let activeTemplate: string = DEFAULT_PATH_TEMPLATE;

export function getPathTemplate(): string {
  return activeTemplate;
}

export function setPathTemplate(template: string): string {
  const t = normalizePathTemplate(template);
  if (!t.ok) throw new Error(t.error);
  activeTemplate = t.template;
  return activeTemplate;
}

export function presetIdForTemplate(template: string): PathPresetId {
  const n = template.trim().replace(/\/$/, "");
  if (n === DEFAULT_PATH_TEMPLATE) return "metamask";
  return "custom";
}

export type PathTemplateOk = { ok: true; template: string };
export type PathTemplateFail = { ok: false; error: string };

/** Trim + validate; keeps `{i}` for multi-account loads. */
export function normalizePathTemplate(
  raw: string,
): PathTemplateOk | PathTemplateFail {
  const template = raw.trim().replace(/\s+/g, "");
  if (!template) return { ok: false, error: "Derivation path is empty." };
  if (!template.startsWith("m/")) {
    return { ok: false, error: "Path must start with m/ (BIP32)." };
  }
  // After substituting a digit for {i}, must look like a Trezor eth path.
  const probe = template.includes(PATH_INDEX_TOKEN)
    ? template.split(PATH_INDEX_TOKEN).join("0")
    : template;
  if (!/^m(\/\d+'?)+$/.test(probe)) {
    return {
      ok: false,
      error: "Bad path — use digits and optional ' (hardened), e.g. m/44'/60'/0'/0/{i}",
    };
  }
  return { ok: true, template };
}

/**
 * Resolve template → concrete path.
 * With `{i}`: index 0 = Account #1. Without `{i}`: fixed path (Connect #1 only).
 */
export function ethAddressPath(
  index = 0,
  template: string = getPathTemplate(),
): string {
  const i = Math.max(0, Math.floor(index));
  const t = template.trim() || DEFAULT_PATH_TEMPLATE;
  if (t.includes(PATH_INDEX_TOKEN)) {
    return t.split(PATH_INDEX_TOKEN).join(String(i));
  }
  return t;
}

/** One BIP32 level after `m`. */
export type PathSegment = {
  /** Fixed number, or account-index placeholder `{i}`. */
  kind: "num" | "index";
  value: number;
  hardened: boolean;
};

/** Face labels + hover text for the Path popup steppers. */
export const PATH_SEGMENT_META = [
  {
    label: "Kind",
    tip: "BIP44 purpose. Leave 44' — means “normal HD wallet path.”",
  },
  {
    label: "Coin",
    tip: "60' = Ethereum-family (Pulse uses the same). Wrong coin → different addresses.",
  },
  {
    label: "Acct",
    tip: "MetaMask / Suite keep this at 0'. Leave it.",
  },
  {
    label: "Change",
    tip: "Leave 0. Not for new wallets — that’s Slot / the Device list.",
  },
  {
    label: "Slot",
    tip: "MetaMask-style address #. Filled by Device Load list (#1,#2…), not the arrows.",
  },
] as const;

/** @deprecated use PATH_SEGMENT_META */
export const PATH_SEGMENT_LABELS = PATH_SEGMENT_META.map((m) => m.label);

/** Parse `m/44'/60'/0'/0/{i}` → segments (null if not a simple 5-level path). */
export function parsePathSegments(template: string): PathSegment[] | null {
  const n = normalizePathTemplate(template);
  if (!n.ok) return null;
  const parts = n.template.slice(2).split("/"); // drop "m/"
  if (parts.length < 2 || parts.length > 8) return null;
  const segs: PathSegment[] = [];
  let indexCount = 0;
  for (const p of parts) {
    const hardened = p.endsWith("'");
    const body = hardened ? p.slice(0, -1) : p;
    if (body === PATH_INDEX_TOKEN) {
      indexCount++;
      segs.push({ kind: "index", value: 0, hardened });
      continue;
    }
    if (!/^\d+$/.test(body)) return null;
    segs.push({
      kind: "num",
      value: Number(body),
      hardened,
    });
  }
  if (indexCount > 1) return null;
  return segs;
}

export function serializePathSegments(segs: PathSegment[]): string {
  const body = segs
    .map((s) => {
      const n = s.kind === "index" ? PATH_INDEX_TOKEN : String(s.value);
      return s.hardened ? `${n}'` : n;
    })
    .join("/");
  return `m/${body}`;
}

export function bumpSegment(
  seg: PathSegment,
  delta: number,
): PathSegment {
  if (seg.kind === "index") return seg;
  return {
    ...seg,
    value: Math.max(0, Math.min(2_147_483_647, seg.value + delta)),
  };
}

/** Mark one level as `{i}`; others that were index become fixed 0. */
export function setSegmentAsIndex(
  segs: PathSegment[],
  at: number,
): PathSegment[] {
  return segs.map((s, i) => {
    if (i === at) return { ...s, kind: "index" as const };
    if (s.kind === "index") return { ...s, kind: "num" as const, value: 0 };
    return s;
  });
}
