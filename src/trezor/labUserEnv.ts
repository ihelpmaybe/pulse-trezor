/**
 * Official trezor-user-env lab probe (don’t-pretend).
 * Controller ws://127.0.0.1:9001 — same wire as Suite/Connect, not a soft-seed unlock.
 */
export type LabUserEnvStatus = {
  controller: "ok" | "missing" | "unknown";
  bridge: boolean | null;
  emulator: boolean | null;
  detail: string;
};

const CONTROLLER_WS = "ws://127.0.0.1:9001/";

/** Controller may return bool or `{ is_running, version }`. */
export function statusRunning(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v && typeof v === "object" && "is_running" in v) {
    return !!(v as { is_running?: boolean }).is_running;
  }
  return !!v;
}

/**
 * One-shot: welcome + background-check.
 * Browser WebSocket to local controller (lab must be running).
 */
export function probeLabUserEnv(timeoutMs = 2_500): Promise<LabUserEnvStatus> {
  return new Promise((resolve) => {
    let settled = false;
    let gotWelcome = false;
    const done = (s: LabUserEnvStatus) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(kill);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(s);
    };
    const kill = window.setTimeout(() => {
      done({
        controller: "missing",
        bridge: null,
        emulator: null,
        detail:
          "Lab controller not reachable on :9001 — run scripts/lab-user-env.ps1 -Action up",
      });
    }, timeoutMs);

    let ws: WebSocket;
    try {
      ws = new WebSocket(CONTROLLER_WS);
    } catch {
      done({
        controller: "missing",
        bridge: null,
        emulator: null,
        detail: "WebSocket unavailable for lab probe",
      });
      return;
    }

    ws.addEventListener("open", () => {
      /* wait for welcome then query */
    });

    ws.addEventListener("message", (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (!gotWelcome && (msg.type === "client" || msg.firmwares != null)) {
        gotWelcome = true;
        ws.send(
          JSON.stringify({ type: "background-check", id: Date.now() % 1_000_000 }),
        );
        return;
      }
      if (msg.background_check === true || msg.bridge_status != null) {
        const bridge = statusRunning(msg.bridge_status);
        const emu = statusRunning(msg.emulator_status);
        done({
          controller: "ok",
          bridge,
          emulator: emu,
          detail: [
            "Lab controller OK",
            bridge ? "Bridge up" : "Bridge down",
            emu ? "Emulator up" : "Emulator down",
            "Wire: Perch → Connect → Suite → Bridge/emu (not soft-seed)",
          ].join(" · "),
        });
      }
    });

    ws.addEventListener("error", () => {
      done({
        controller: "missing",
        bridge: null,
        emulator: null,
        detail:
          "Lab controller missing — Docker user-env not running (see scripts/lab-user-env.ps1)",
      });
    });
  });
}

/** Operator checklist — never claim HW until Suite sees the emu. */
export const LAB_USER_ENV_CHECKLIST = [
  "Start lab: scripts/lab-user-env.ps1 -Action up (Docker Desktop)",
  "Dashboard: http://127.0.0.1:9002 — start emulator (T3T1 / T2T1)",
  "Suite: Debug → disable bundled Bridge if using user-env Bridge :21325",
  "Open Suite, unlock emu, then Perch Connect (same Connect 10 path as real device)",
  "Confirm taps: scripts/emu-yes.ps1 (slow YES — do not spam)",
  "Kill_if: software HD labeled “Trezor” / skipping Suite",
] as const;
