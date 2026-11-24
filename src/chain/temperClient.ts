/**
 * Thin HTTP client for EnsoBuild/Temper (MIT) — POST /api/v1/simulate.
 * Optional: set VITE_TEMPER_URL or localStorage pulse-desk-temper-url.
 * Default probe: http://127.0.0.1:8080 when unset (self-host).
 */
import type { Address, Hex } from "viem";

export const TEMPER_URL_KEY = "pulse-desk-temper-url";

export type TemperSimulateRequest = {
  chainId: number;
  from: string;
  to: string;
  data?: string;
  gasLimit: number;
  value: string;
  blockNumber?: number;
  formatTrace?: boolean;
};

export type TemperLog = {
  topics: string[];
  data: string;
  address: string;
};

export type TemperSimulateResponse = {
  simulationId?: string;
  gasUsed?: number;
  blockNumber?: number;
  success: boolean;
  logs?: TemperLog[];
  exitReason?: string;
  bytes?: string;
  formattedTrace?: string;
  /** Public hosted API may return this. */
  simulationUrl?: string;
};

export function loadTemperBaseUrl(): string {
  try {
    const ls = (localStorage.getItem(TEMPER_URL_KEY) || "").trim();
    if (ls) return ls.replace(/\/$/, "");
  } catch {
    /* ignore */
  }
  const env = (import.meta.env.VITE_TEMPER_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, "");
  return "http://127.0.0.1:8080";
}

export function saveTemperBaseUrl(url: string): void {
  try {
    const t = url.trim();
    if (!t) localStorage.removeItem(TEMPER_URL_KEY);
    else localStorage.setItem(TEMPER_URL_KEY, t.replace(/\/$/, ""));
  } catch {
    /* ignore */
  }
}

/**
 * One-shot Temper simulate. Short timeout — never hang the desk.
 * Returns null when Temper is down / CORS / unsupported chain.
 */
export async function temperSimulate(
  req: TemperSimulateRequest,
  opts?: { baseUrl?: string; timeoutMs?: number },
): Promise<TemperSimulateResponse | null> {
  const base = (opts?.baseUrl ?? loadTemperBaseUrl()).replace(/\/$/, "");
  if (!base) return null;
  const timeoutMs = opts?.timeoutMs ?? 2_500;
  const ctrl = new AbortController();
  const kill = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/api/v1/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...req,
        formatTrace: req.formatTrace ?? false,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as TemperSimulateResponse;
    if (typeof json.success !== "boolean") return null;
    return json;
  } catch {
    return null;
  } finally {
    window.clearTimeout(kill);
  }
}

/** One-shot GET /status — { is_running } when Temper is up. */
export async function temperStatus(opts?: {
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; is_running?: boolean; detail: string }> {
  const base = (opts?.baseUrl ?? loadTemperBaseUrl()).replace(/\/$/, "");
  if (!base) return { ok: false, detail: "No Temper URL" };
  const timeoutMs = opts?.timeoutMs ?? 1_500;
  const ctrl = new AbortController();
  const kill = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return { ok: false, detail: `Temper HTTP ${res.status}` };
    }
    const json = (await res.json()) as { is_running?: boolean };
    return {
      ok: !!json.is_running,
      is_running: json.is_running,
      detail: json.is_running ? "Temper running" : "Temper idle / not ready",
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "Temper unreachable",
    };
  } finally {
    window.clearTimeout(kill);
  }
}

/** Build Temper body from desk/WC tx fields. */
export function toTemperRequest(opts: {
  chainId: number;
  from: Address;
  to: Address;
  data?: Hex | string;
  valueWei?: bigint;
  gasLimit?: number;
}): TemperSimulateRequest {
  return {
    chainId: opts.chainId,
    from: opts.from,
    to: opts.to,
    data: opts.data && opts.data !== "0x" ? String(opts.data) : undefined,
    gasLimit: opts.gasLimit ?? 500_000,
    value: (opts.valueWei ?? 0n).toString(),
  };
}
