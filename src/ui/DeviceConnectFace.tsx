/**
 * Connect face chrome — device art · 3-step strip · post-Allow checklist · firmware CTA.
 * Ideas from public HW-wallet polish; art is Perch-original (not OneKey/Trezor product dumps).
 */
import type { DeviceHints, SuiteChannel } from "../trezor/connect";
import { t } from "../i18n/en";

/** Official Suite / firmware help — open in browser; Suite Desktop owns the update. */
export const TREZOR_FIRMWARE_HELP =
  "https://trezor.io/learn/a/update-trezor-device-firmware";
export const TREZOR_SUITE_WEB = "https://suite.trezor.io/web/";

export type ConnectStepId = "suite" | "allow" | "ready";

/**
 * Short cue while Suite Allow is pending — other-monitor / taskbar is the usual miss.
 */
export function suiteAllowCue(opts: {
  connecting: boolean;
  listing: boolean;
  suiteDesktop: boolean;
  accountCount: number;
}): string | null {
  if (!opts.connecting) return null;
  if (opts.listing) {
    return `Suite Allow — exporting addresses 0–${Math.max(0, opts.accountCount - 1)}. Check the Suite window (taskbar / other monitor).`;
  }
  if (opts.suiteDesktop) {
    return "Look at Trezor Suite now — Allow Pulse Perch. It may be behind Cursor or on your other monitor (taskbar: Trezor Suite).";
  }
  return "Waiting on Suite — unlock the Trezor in Suite, then Allow Pulse Perch (other screen OK).";
}

export function connectSteps(opts: {
  suiteChannel: SuiteChannel;
  connecting: boolean;
  hasSession: boolean;
}): { id: ConnectStepId; label: string; state: "done" | "current" | "todo" }[] {
  const suiteUp = opts.suiteChannel === "desktop";
  const suiteDone = suiteUp || opts.connecting || opts.hasSession;
  const allowDone = opts.hasSession;
  const allowCurrent = opts.connecting && !opts.hasSession;
  const readyDone = opts.hasSession;
  const readyCurrent = opts.hasSession;

  return [
    {
      id: "suite",
      label: t("stepOpenSuite"),
      state: suiteDone
        ? allowCurrent || readyCurrent
          ? "done"
          : suiteUp
            ? "done"
            : "current"
        : "current",
    },
    {
      id: "allow",
      label: t("stepAllowConnect"),
      state: allowDone ? "done" : allowCurrent ? "current" : "todo",
    },
    {
      id: "ready",
      label: t("stepReady"),
      state: readyDone ? "done" : "todo",
    },
  ];
}

type Props = {
  suiteChannel: SuiteChannel;
  connecting: boolean;
  listing: boolean;
  hasSession: boolean;
  canSign: boolean;
  accountCount: number;
  deviceHints: DeviceHints | null;
  suiteCue: string | null;
  /** Show compact checklist after first Allow (session on). */
  showChecklist: boolean;
  /** Official CONNECT_UNACQUIRED → getFeatures acquire. */
  onAcquireDevice?: () => void;
  acquireBusy?: boolean;
};

export function DeviceConnectFace({
  suiteChannel,
  connecting,
  listing,
  hasSession,
  canSign,
  accountCount,
  deviceHints,
  suiteCue,
  showChecklist,
  onAcquireDevice,
  acquireBusy = false,
}: Props) {
  const steps = connectSteps({
    suiteChannel,
    connecting,
    hasSession,
  });
  const fwOutdated = !!deviceHints?.outdated;
  const label =
    deviceHints?.label?.trim() ||
    (hasSession ? "Trezor" : "Your Trezor");

  return (
    <div className="device-connect-face">
      <div className="device-connect-hero">
        <img
          className="device-connect-art"
          src="/trezor-device.svg?v=2"
          width={72}
          height={96}
          alt=""
          aria-hidden
        />
        <div className="device-connect-hero-copy">
          <p className="device-connect-title">{label}</p>
          <p className="muted device-connect-sub">
            {suiteChannel === "desktop"
              ? t("suiteDesktopLinked")
              : t("suiteWebOrDesktop")}
            {deviceHints?.firmware
              ? ` ·${deviceHints.model ? ` ${deviceHints.model}` : ""} FW ${deviceHints.firmware}`
              : ""}
            {canSign ? " · signing on" : ""}
          </p>
          <p className="device-connect-channel" role="status">
            <span className="device-connect-chip">{t("viaSuite")}</span>
            <span className="muted">
              {" "}
              {t("viaSuiteHint")}
            </span>
          </p>
        </div>
      </div>

      {connecting && suiteCue ? (
        <div className="suite-allow-callout" role="status">
          <p className="suite-allow-callout-title">{t("suiteAllowTitle")}</p>
          <p className="suite-allow-callout-body">{suiteCue}</p>
          <p className="muted fee suite-allow-callout-hint">
            {t("suiteAllowHint")}
          </p>
        </div>
      ) : null}

      <ol className="device-connect-steps" aria-label="Connect steps">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`device-connect-step ${s.state}`}
            aria-current={s.state === "current" ? "step" : undefined}
          >
            <span className="device-connect-step-n">{i + 1}</span>
            <span className="device-connect-step-l">{s.label}</span>
          </li>
        ))}
      </ol>

      {fwOutdated ? (
        <p className="warn-line device-fw-cta" role="status">
          Firmware {deviceHints?.firmware ?? "?"} looks outdated.{" "}
          <a
            href={TREZOR_FIRMWARE_HELP}
            target="_blank"
            rel="noreferrer"
          >
            Check firmware updates
          </a>{" "}
          in Suite before big moves.
        </p>
      ) : null}

      {deviceHints?.transportError ? (
        <p className="warn-line" role="status">
          {deviceHints.transportError}
        </p>
      ) : null}

      {deviceHints?.unacquired ? (
        <div className="device-unacquired" role="status">
          <p className="warn-line">
            Trezor is plugged in but busy elsewhere (other tab / after refresh).
            Take the session, then Connect again.
          </p>
          {onAcquireDevice ? (
            <button
              type="button"
              className="btn ghost"
              disabled={acquireBusy || connecting}
              onClick={onAcquireDevice}
            >
              {acquireBusy ? t("acquiring") : t("acquireDevice")}
            </button>
          ) : null}
        </div>
      ) : null}

      {showChecklist && hasSession ? (
        <ul className="device-connect-check" aria-label="After Allow">
          <li className={fwOutdated ? "todo" : "ok"}>
            {fwOutdated
              ? "Update firmware in Suite"
              : `Firmware check${deviceHints?.firmware ? ` (${deviceHints.firmware})` : ""} — Suite owns genuine/device trust`}
          </li>
          <li className="ok">
            PIN / passphrase stay on device &amp; Suite — never typed into Perch
          </li>
          <li className="ok">
            Rejects only on the device — Perch never fakes a HW deny
          </li>
          <li className={accountCount > 0 ? "ok" : "todo"}>
            {accountCount > 0
              ? `${accountCount} address${accountCount === 1 ? "" : "es"} loaded`
              : listing
                ? "Loading addresses…"
                : "Load addresses (Add more / Load)"}
          </li>
        </ul>
      ) : null}

      {!hasSession && !connecting ? (
        <p className="muted empty-teach">
          Plug in the Trezor, open{" "}
          <a href={TREZOR_SUITE_WEB} target="_blank" rel="noreferrer">
            Trezor Suite
          </a>
          , unlock it, then <strong>Start connection</strong>. The Allow prompt
          is in <strong>Suite</strong> — often on another monitor or under the
          taskbar. PIN stays on the device. Stuck? <strong>Stop waiting</strong>
          , then start again — that does not reject on the device.
        </p>
      ) : null}
    </div>
  );
}

/** Err banner helper — offer firmware help when Suite/FW is the likely fix. */
export function shouldOfferFirmwareHelp(
  err: string | null | undefined,
  outdated: boolean,
): boolean {
  if (outdated) return true;
  if (!err) return false;
  const s = err.toLowerCase();
  return (
    s.includes("firmware") ||
    s.includes("outdated") ||
    s.includes("suite not reachable") ||
    s.includes("could not reach suite") ||
    s.includes("no trezor") ||
    s.includes("not found")
  );
}
