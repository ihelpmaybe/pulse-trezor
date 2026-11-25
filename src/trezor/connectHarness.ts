/**
 * Connect e2e harness — fake face scenarios + real-wire checklist.
 * Fakes never claim to be a Trezor. Lab/device path = Connect → Suite → Bridge/emu.
 */
import {
  connectSteps,
  type ConnectStepId,
} from "../ui/DeviceConnectFace";
import type { SuiteChannel } from "./connect";
import { humanTrezorError, messageFromTrezorPayload } from "./errors";
import { LAB_USER_ENV_CHECKLIST } from "./labUserEnv";

export type ConnectHarnessMode = "fake" | "lab" | "device";

export type ConnectFaceScenario = {
  id: string;
  /** What the face is simulating — never “signed by Trezor”. */
  label: string;
  suiteChannel: SuiteChannel;
  connecting: boolean;
  hasSession: boolean;
  /** Expected step that should be `current` (or all done). */
  expectCurrent: ConnectStepId | "all-done";
  /** Optional raw Connect error → human string check. */
  errorRaw?: string;
  expectErrorIncludes?: string;
};

/** Deterministic face/error cases for CI — no Suite, no seed. */
export const CONNECT_FACE_SCENARIOS: ConnectFaceScenario[] = [
  {
    id: "suite-missing-idle",
    label: "Suite Desktop missing · idle",
    suiteChannel: "web-or-missing",
    connecting: false,
    hasSession: false,
    expectCurrent: "suite",
  },
  {
    id: "suite-up-idle",
    label: "Suite Desktop up · waiting for Connect click",
    suiteChannel: "desktop",
    connecting: false,
    hasSession: false,
    expectCurrent: "suite",
  },
  {
    id: "waiting-allow",
    label: "Connect clicked · Waiting on Suite Allow",
    suiteChannel: "desktop",
    connecting: true,
    hasSession: false,
    expectCurrent: "allow",
  },
  {
    id: "connecting-suite-missing",
    label: "Connect clicked · Suite Desktop missing (do not green Suite)",
    suiteChannel: "web-or-missing",
    connecting: true,
    hasSession: false,
    expectCurrent: "suite",
  },
  {
    id: "session-ready",
    label: "Session linked (fake address only — not a device proof)",
    suiteChannel: "desktop",
    connecting: false,
    hasSession: true,
    expectCurrent: "all-done",
  },
  {
    id: "err-permissions",
    label: "PermissionsNotGranted → Allow coaching",
    suiteChannel: "desktop",
    connecting: false,
    hasSession: false,
    // Suite still up after deny — face idle; error string is the proof
    expectCurrent: "suite",
    errorRaw: "Method_PermissionsNotGranted",
    expectErrorIncludes: "Allow",
  },
  {
    id: "err-cancel",
    label: "Method_Cancel → retry Connect (Suite can stay linked)",
    suiteChannel: "desktop",
    connecting: false,
    hasSession: false,
    expectCurrent: "suite",
    errorRaw: "Method_Cancel",
    expectErrorIncludes: "cancelled",
  },
  {
    id: "err-disconnected",
    label: "Device_Disconnected → plug/unlock coaching",
    suiteChannel: "desktop",
    connecting: false,
    hasSession: false,
    expectCurrent: "suite",
    errorRaw: "Device_Disconnected",
    expectErrorIncludes: "disconnected",
  },
  {
    id: "err-used-elsewhere",
    label: "Device_UsedElsewhere → Acquire coaching",
    suiteChannel: "desktop",
    connecting: false,
    hasSession: false,
    expectCurrent: "suite",
    errorRaw: "Device_UsedElsewhere",
    expectErrorIncludes: "busy",
  },
];

export function runFaceScenario(s: ConnectFaceScenario): {
  ok: boolean;
  steps: ReturnType<typeof connectSteps>;
  humanError: string | null;
  detail: string;
} {
  const steps = connectSteps({
    suiteChannel: s.suiteChannel,
    connecting: s.connecting,
    hasSession: s.hasSession,
  });
  let ok = true;
  let detail = s.label;

  const snap = steps.map((x) => `${x.id}:${x.state}`).join(",");
  const suiteIdleDesktop =
    s.suiteChannel === "desktop" && !s.connecting && !s.hasSession;
  if (s.expectCurrent === "all-done") {
    ok = steps.every((st) => st.state === "done");
    if (!ok) detail = `expected all done; got ${snap}`;
  } else if (suiteIdleDesktop) {
    // Desktop up, idle (incl. post-error) → Open Suite done, Allow still todo
    ok = steps[0].state === "done" && steps[1].state === "todo";
    if (!ok) detail = `expected suite=done,allow=todo; got ${snap}`;
  } else {
    const cur = steps.find((st) => st.id === s.expectCurrent);
    ok = cur?.state === "current";
    if (!ok) detail = `expected ${s.expectCurrent}=current; got ${snap}`;
  }

  let humanError: string | null = null;
  if (s.errorRaw) {
    humanError = humanTrezorError(s.errorRaw);
    if (
      s.expectErrorIncludes &&
      !humanError.toLowerCase().includes(s.expectErrorIncludes.toLowerCase())
    ) {
      ok = false;
      detail = `error map miss: want ~${s.expectErrorIncludes}, got ${humanError}`;
    }
  }

  return { ok, steps, humanError, detail };
}

export function runAllFaceScenarios(): {
  ok: boolean;
  passed: number;
  failed: { id: string; detail: string }[];
} {
  const failed: { id: string; detail: string }[] = [];
  for (const s of CONNECT_FACE_SCENARIOS) {
    const r = runFaceScenario(s);
    if (!r.ok) failed.push({ id: s.id, detail: r.detail });
  }
  return {
    ok: failed.length === 0,
    passed: CONNECT_FACE_SCENARIOS.length - failed.length,
    failed,
  };
}

/** Payload → human (MM-style) — fake Connect failure bodies. */
export function fakeConnectFailureHuman(code: string, error?: string): string {
  return messageFromTrezorPayload({ code, error });
}

/** Operator checklist for real Connect wire (device or official emu). */
export const CONNECT_DEVICE_CHECKLIST = [
  ...LAB_USER_ENV_CHECKLIST,
  "Desk on 943 for dust; Connect → Allow in Suite → address matches device/emu screen",
  "Optional: scripts/connect-e2e-harness.mjs lab — probes controller only",
  "Optional: scripts/emu-yes.ps1 for slow YES taps (do not spam)",
  "Evidence: paste date + path (Suite Desktop / emu model) under tests/connect/",
  "Kill_if: software HD / mnemonic unlock labeled as Trezor",
] as const;

export function harnessBanner(mode: ConnectHarnessMode): string {
  if (mode === "fake") {
    return "FAKE face/error only — not a hardware proof";
  }
  if (mode === "lab") {
    return "LAB probe — official trezor-user-env controller; still need Suite Allow for Perch";
  }
  return "DEVICE checklist — Connect → Suite → Bridge → real device or official emu";
}
