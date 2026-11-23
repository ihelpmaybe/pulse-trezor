/**
 * Agent policy prefs + hard gate.
 * Human UI / WalletConnect dapps are not gated here.
 * Agents must use `window.__pulsePerchAi` — those calls assert prefs.
 * Keys never leave the transport (Trezor). allowSign = may *request* a sign;
 * the device / user still confirms.
 */

import type { Address, Hash, Hex } from "viem";
import type { DeskChainId, RpcOverride } from "../chain/client";

export type AiPrefs = {
  explainBeforeSign: boolean;
  simulateTx: boolean;
  agentPrepare: boolean;
  clearSignHints: boolean;
  /** Opt-in: agent may request signs (user/device still confirms). */
  allowSign: boolean;
};

export type AiCapability =
  | "explain"
  | "simulate"
  | "prepare"
  | "clearSign"
  | "sign";

export const AI_KEY = "pulse-perch-ai-v1";

export const AI_DEFAULT: AiPrefs = {
  explainBeforeSign: true,
  simulateTx: true,
  agentPrepare: true,
  clearSignHints: true,
  allowSign: false,
};

const CAP_TO_PREF: Record<AiCapability, keyof AiPrefs> = {
  explain: "explainBeforeSign",
  simulate: "simulateTx",
  prepare: "agentPrepare",
  clearSign: "clearSignHints",
  sign: "allowSign",
};

export class AgentPolicyError extends Error {
  readonly code = "AGENT_POLICY_DENIED" as const;
  readonly capability: AiCapability;

  constructor(capability: AiCapability, detail?: string) {
    super(
      detail ||
        `Agent policy denies "${capability}". Turn it on under Settings → Agent policy.`,
    );
    this.name = "AgentPolicyError";
    this.capability = capability;
  }
}

export type AgentTxDraft = {
  chainId: DeskChainId;
  to: Address;
  value?: bigint | string;
  data?: Hex;
  rpc?: RpcOverride;
};

export type AgentPrepareResult = {
  chainId: DeskChainId;
  to: Address;
  value: string;
  data?: Hex;
  note: string;
};

export type AgentSignHandler = (draft: AgentTxDraft) => Promise<Hash>;
export type AgentPrepareHandler = (
  draft: AgentTxDraft,
) => Promise<AgentPrepareResult>;
export type AgentSimulateHandler = (
  draft: AgentTxDraft,
) => Promise<{ ok: boolean; detail: string }>;
export type AgentExplainHandler = (
  draft: AgentTxDraft,
) => Promise<{ summary: string }>;

export type PulsePerchAiBridge = {
  version: 1;
  prefs: AiPrefs;
  getPrefs: () => AiPrefs;
  setPrefs: (partial: Partial<AiPrefs>) => AiPrefs;
  may: (capability: AiCapability) => boolean;
  assert: (capability: AiCapability) => void;
  canRequestSign: () => boolean;
  /** Hard-gated. Throws AgentPolicyError if Sign requests is off. */
  requestSign: (draft: AgentTxDraft) => Promise<Hash>;
  requestPrepare: (draft: AgentTxDraft) => Promise<AgentPrepareResult>;
  requestSimulate: (
    draft: AgentTxDraft,
  ) => Promise<{ ok: boolean; detail: string }>;
  requestExplain: (draft: AgentTxDraft) => Promise<{ summary: string }>;
};

declare global {
  interface Window {
    __pulsePerchAi?: PulsePerchAiBridge;
  }
}

let signHandler: AgentSignHandler | null = null;
let prepareHandler: AgentPrepareHandler | null = null;
let simulateHandler: AgentSimulateHandler | null = null;
let explainHandler: AgentExplainHandler | null = null;

export function loadAiPrefs(): AiPrefs {
  try {
    const raw = localStorage.getItem(AI_KEY);
    if (!raw) return { ...AI_DEFAULT };
    return { ...AI_DEFAULT, ...(JSON.parse(raw) as Partial<AiPrefs>) };
  } catch {
    return { ...AI_DEFAULT };
  }
}

export function saveAiPrefs(prefs: AiPrefs) {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function applyAiPrefs(prefs: AiPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.toggleAttribute("data-ai-explain", prefs.explainBeforeSign);
  root.toggleAttribute("data-ai-simulate", prefs.simulateTx);
  root.toggleAttribute("data-ai-prepare", prefs.agentPrepare);
  root.toggleAttribute("data-ai-clearsign", prefs.clearSignHints);
  root.toggleAttribute("data-ai-sign", prefs.allowSign);
}

export function isCapabilityAllowed(capability: AiCapability): boolean {
  const prefs = loadAiPrefs();
  return Boolean(prefs[CAP_TO_PREF[capability]]);
}

export function assertCapability(capability: AiCapability): void {
  if (!isCapabilityAllowed(capability)) {
    throw new AgentPolicyError(capability);
  }
}

function defaultPrepare(draft: AgentTxDraft): AgentPrepareResult {
  const value =
    typeof draft.value === "bigint"
      ? draft.value.toString()
      : String(draft.value ?? "0");
  return {
    chainId: draft.chainId,
    to: draft.to,
    value,
    data: draft.data,
    note: "Unsigned draft only — not sent. Confirm on device if you later sign.",
  };
}

function rebuildBridge(prefs: AiPrefs): PulsePerchAiBridge {
  const bridge: PulsePerchAiBridge = {
    version: 1,
    prefs: { ...prefs },
    getPrefs: () => loadAiPrefs(),
    setPrefs: (partial) => {
      const next = { ...loadAiPrefs(), ...partial };
      saveAiPrefs(next);
      applyAiPrefs(next);
      const published = rebuildBridge(next);
      if (typeof window !== "undefined") window.__pulsePerchAi = published;
      return next;
    },
    may: (capability) => isCapabilityAllowed(capability),
    assert: (capability) => assertCapability(capability),
    canRequestSign: () => isCapabilityAllowed("sign"),
    requestSign: async (draft) => {
      assertCapability("sign");
      if (!signHandler) {
        throw new AgentPolicyError(
          "sign",
          "No live Perch session for agent sign. Connect the device first.",
        );
      }
      return signHandler(draft);
    },
    requestPrepare: async (draft) => {
      assertCapability("prepare");
      if (prepareHandler) return prepareHandler(draft);
      return defaultPrepare(draft);
    },
    requestSimulate: async (draft) => {
      assertCapability("simulate");
      if (simulateHandler) return simulateHandler(draft);
      return {
        ok: true,
        detail:
          "Simulate allowed — no dry-run handler yet. Review the draft yourself.",
      };
    },
    requestExplain: async (draft) => {
      assertCapability("explain");
      if (explainHandler) return explainHandler(draft);
      const value =
        typeof draft.value === "bigint"
          ? draft.value.toString()
          : String(draft.value ?? "0");
      return {
        summary: `Send to ${draft.to} · value ${value} wei · chain ${draft.chainId}${
          draft.data ? " · has calldata" : ""
        }.`,
      };
    },
  };
  return bridge;
}

export function publishAiBridge(prefs: AiPrefs): PulsePerchAiBridge {
  const bridge = rebuildBridge(prefs);
  if (typeof window !== "undefined") window.__pulsePerchAi = bridge;
  return bridge;
}

export function registerAgentHandlers(handlers: {
  sign?: AgentSignHandler | null;
  prepare?: AgentPrepareHandler | null;
  simulate?: AgentSimulateHandler | null;
  explain?: AgentExplainHandler | null;
}) {
  if ("sign" in handlers) signHandler = handlers.sign ?? null;
  if ("prepare" in handlers) prepareHandler = handlers.prepare ?? null;
  if ("simulate" in handlers) simulateHandler = handlers.simulate ?? null;
  if ("explain" in handlers) explainHandler = handlers.explain ?? null;
  if (typeof window !== "undefined" && window.__pulsePerchAi) {
    publishAiBridge(loadAiPrefs());
  }
}

/** Boot prefs + bridge even before Settings opens. */
export function bootAiPolicy() {
  const prefs = loadAiPrefs();
  applyAiPrefs(prefs);
  return publishAiBridge(prefs);
}
