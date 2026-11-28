/**
 * Settings dialog — About, install, device, RPC, display, modules, a11y, inject.
 */
import {
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { AiPolicyPanel } from "../ai/AiPolicyPanel";
import type { DeskChainId } from "../chain/client";
import {
  loadTemperBaseUrl,
  saveTemperBaseUrl,
  temperStatus,
} from "../chain/temperClient";
import type { DeviceHints, ListedAccount, SuiteChannel } from "../trezor/connect";
import {
  LAB_USER_ENV_CHECKLIST,
  probeLabUserEnv,
  type LabUserEnvStatus,
} from "../trezor/labUserEnv";
import { t } from "../i18n/en";
import type { BagTab } from "./BagPanel";
import { AddEvmForm } from "./AddEvmForm";
import { InstallPwa } from "./InstallPwa";
import { LocalDeskQuit } from "./LocalDeskQuit";
import {
  loadLightMetrics,
  loadMetricsOptIn,
  saveMetricsOptIn,
} from "./lightMetrics";
import { SyncPair } from "./SyncPair";
import {
  RPC_HEALTH_MS_OPTIONS,
  saveInjectEth,
  saveRpcHealthMs,
  type A11yPrefs,
  type Session,
  type ThemePref,
} from "./deskStorage";
import { applyTheme } from "./deskStorage";
import { saveHexModule, saveMascot } from "./modules";

type RpcOption = { name: string; url: string };

type Props = {
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onOpenFaq: () => void;
  suiteChannel: SuiteChannel;
  deviceHints: DeviceHints | null;
  exportWatchJson: () => void;
  exportBagSnapshot: () => void;
  onImportBagFile: (file: File) => void;
  onClearBagCache: () => void;
  active: Session | null;
  watchImportBusy: boolean;
  onImportWatchFile: (file: File) => void;
  accountList: ListedAccount[];
  watch: Session | null;
  session: Session | null;
  chainId: DeskChainId;
  setChainId: (id: DeskChainId) => void;
  setAsset: (sym: string) => void;
  setErr: (msg: string | null) => void;
  deviceId: string;
  applyWatchImportText: (text: string) => void;
  setWatchImportBusy: (busy: boolean) => void;
  rpcSelectValue: string;
  rpcOptions: RpcOption[];
  defaultRpcUrl: string;
  activeRpcUrl: string;
  rpcDraft: string;
  setRpcDraft: (v: string) => void;
  setRpcCustomMode: (on: boolean) => void;
  applyRpc: (url: string, custom?: boolean) => void;
  onSaveRpc: () => void;
  rpcHealthMs: number;
  setRpcHealthMs: (ms: number) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  mascotOn: boolean;
  setMascotOn: (on: boolean) => void;
  hexModule: boolean;
  setHexModule: (on: boolean) => void;
  bagTab: BagTab;
  setBagTab: (t: BagTab) => void;
  a11y: A11yPrefs;
  patchA11y: (partial: Partial<A11yPrefs>) => void;
  injectEth: boolean;
  setInjectEth: Dispatch<SetStateAction<boolean>>;
};

export function SettingsModal(p: Props) {
  const [temperDraft, setTemperDraft] = useState(() => loadTemperBaseUrl());
  const [lab, setLab] = useState<LabUserEnvStatus | null>(null);
  const [metricsOn, setMetricsOn] = useState(() => loadMetricsOptIn());
  const [metrics, setMetrics] = useState(() => loadLightMetrics());
  const [labBusy, setLabBusy] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  return (
    <div
      className="rpc-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) p.onClose();
      }}
    >
      <div
        className="rpc-modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        ref={p.panelRef}
      >
        <div className="rpc-modal-head">
          <h3>Settings</h3>
          <button
            type="button"
            className="btn ghost rpc-modal-close"
            onClick={p.onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <h4 className="settings-section">About</h4>
        <p className="muted fee">
          Pulse Perch · v0.1.0 · hardware path · no phone-home · no seed in
          browser · local prefs only
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className={metricsOn ? "vision-tile on" : "vision-tile"}
            aria-pressed={metricsOn}
            onClick={() => {
              const next = !metricsOn;
              saveMetricsOptIn(next);
              setMetricsOn(next);
              setMetrics(loadLightMetrics());
            }}
          >
            <span className="vision-copy">
              <span className="vision-title">{t("metricsOptInTitle")}</span>
              <span className="vision-blurb">{t("metricsOptInBlurb")}</span>
            </span>
            <span className="vision-switch" aria-hidden="true">
              <span className="vision-knob" />
            </span>
          </button>
          <button type="button" className="btn ghost" onClick={p.onOpenFaq}>
            FAQ
          </button>
        </div>
        {metricsOn ? (
          <p className="muted fee">
            {t("metricsCountLabel")}: {metrics.firstSendCount}
            {metrics.lastSendAt
              ? ` · last ${metrics.lastSendAt.slice(0, 10)}`
              : ""}
          </p>
        ) : null}
        <details
          className="gas-details settings-fold"
          open={guidesOpen}
          onToggle={(e) =>
            setGuidesOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary>Guides</summary>
          <p className="muted fee settings-link-row">
            <a
              className="link"
              href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/status.md"
              target="_blank"
              rel="noreferrer"
            >
              What works
            </a>
            <a
              className="link"
              href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/suite-connect.md"
              target="_blank"
              rel="noreferrer"
            >
              Suite + Connect
            </a>
            <a
              className="link"
              href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/pls-on-trezor.md"
              target="_blank"
              rel="noreferrer"
            >
              PLS on Trezor
            </a>
            <a
              className="link"
              href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/provex.md"
              target="_blank"
              rel="noreferrer"
            >
              ProveX
            </a>
            <a
              className="link"
              href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/migrate-from-eth.md"
              target="_blank"
              rel="noreferrer"
            >
              Migrate from ETH
            </a>
            <a
              className="link"
              href="https://github.com/ihelpmaybe/pulse-trezor/blob/main/docs/UNINSTALL-METAMASK-FOR-PULSE.md"
              target="_blank"
              rel="noreferrer"
            >
              Uninstall MetaMask
            </a>
            <a
              className="link"
              href="https://suite.trezor.io"
              target="_blank"
              rel="noreferrer"
            >
              Trezor Suite
            </a>
            <a
              className="link"
              href="https://bridge.pulsechain.com"
              target="_blank"
              rel="noreferrer"
            >
              Pulse Bridge
            </a>
          </p>
          <p className="muted fee">{t("updatesHint")}</p>
        </details>

        <InstallPwa />
        <LocalDeskQuit />

        <h4 className="settings-section">Networks</h4>
        <AddEvmForm
          chainId={p.chainId}
          setChainId={p.setChainId}
          setAsset={p.setAsset}
          setErr={p.setErr}
        />

        <h4 className="settings-section">Device</h4>
        <p className="muted fee">
          Suite:{" "}
          {p.suiteChannel === "desktop"
            ? t("suiteDesktopWs")
            : p.suiteChannel === "web-or-missing"
              ? t("suiteNotDetected")
              : t("checking")}
          {p.deviceHints?.firmware
            ? ` · FW ${p.deviceHints.firmware}${p.deviceHints.outdated ? " (outdated)" : ""}`
            : ""}
          {p.deviceHints?.passphraseProtection ? " · passphrase on" : ""}
        </p>
        <div className="settings-actions">
          <button type="button" className="btn ghost" onClick={p.exportWatchJson}>
            {t("exportWatch")}
          </button>
          <label className="btn ghost watch-import">
            {p.watchImportBusy ? "…" : t("importWatch")}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={p.watchImportBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) p.onImportWatchFile(f);
              }}
            />
          </label>
        </div>

        <h4 className="settings-section">Bag data</h4>
        <p className="muted fee">
          Stays on this PC. Upload: Perch snapshot, single pulse-portfolio export, or multi-wallet watch export.
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="btn ghost"
            disabled={!p.active}
            onClick={p.exportBagSnapshot}
          >
            Download bag
          </button>
          <label className="btn ghost watch-import">
            {p.watchImportBusy ? "…" : "Upload bag"}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={p.watchImportBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) p.onImportBagFile(f);
              }}
            />
          </label>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (
                window.confirm(
                  "Clear cached bag data on this PC? Addresses stay until you hit Forget.",
                )
              ) {
                p.onClearBagCache();
              }
            }}
          >
            Clear bag cache
          </button>
        </div>
        <SyncPair
          accounts={p.accountList.map((a) => ({
            address: a.address,
            derivationIndex: a.derivationIndex,
            derivationPath: a.derivationPath,
          }))}
          watch={
            p.watch
              ? {
                  address: p.watch.address,
                  derivationIndex: p.watch.derivationIndex,
                }
              : p.session
                ? {
                    address: p.session.address,
                    derivationIndex: p.session.derivationIndex,
                  }
                : null
          }
          chainId={p.chainId}
          walletFingerprint={
            p.deviceId ? `trezor:${p.deviceId}` : p.watch ? "watch" : "perch"
          }
          busy={p.watchImportBusy}
          onImportText={(text) => {
            p.setWatchImportBusy(true);
            try {
              p.applyWatchImportText(text);
            } finally {
              p.setWatchImportBusy(false);
            }
          }}
        />

        <h4 className="settings-section">RPC</h4>
        <div className="settings-rpc-grid">
          <label className="field">
            Node
            <select
              value={p.rpcSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom__") {
                  p.setRpcCustomMode(true);
                  p.setRpcDraft(p.activeRpcUrl);
                  return;
                }
                p.applyRpc(v === p.defaultRpcUrl ? "" : v, false);
              }}
            >
              {p.rpcOptions.map((s) => (
                <option key={s.url} value={s.url}>
                  {s.name}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
          </label>
          <label className="field">
            Health check
            <select
              value={String(p.rpcHealthMs)}
              onChange={(e) => {
                const ms = Number(e.target.value);
                p.setRpcHealthMs(ms);
                saveRpcHealthMs(ms);
              }}
            >
              {RPC_HEALTH_MS_OPTIONS.map((o) => (
                <option key={o.ms} value={o.ms}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {p.rpcSelectValue === "__custom__" ? (
          <div className="settings-actions">
            <label className="field settings-grow">
              Custom URL
              <input
                value={p.rpcDraft}
                onChange={(e) => p.setRpcDraft(e.target.value)}
                placeholder={p.defaultRpcUrl}
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <button type="button" className="btn" onClick={p.onSaveRpc}>
              Save RPC
            </button>
          </div>
        ) : null}
        <p className="muted fee">Latency chip ping. Off = once on load / RPC change.</p>

        <h4 className="settings-section">Face</h4>
        <div className="vision-grid" role="group" aria-label="Face options">
          <button
            type="button"
            className={p.theme === "light" ? "vision-tile on" : "vision-tile"}
            aria-pressed={p.theme === "light"}
            onClick={() => {
              const next: ThemePref = p.theme === "light" ? "dark" : "light";
              p.setTheme(next);
              applyTheme(next);
            }}
          >
            <span className="vision-copy">
              <span className="vision-title">{t("lightTheme")}</span>
              <span className="vision-blurb">Light colors</span>
            </span>
            <span className="vision-switch" aria-hidden="true">
              <span className="vision-knob" />
            </span>
          </button>
          <button
            type="button"
            className={p.mascotOn ? "vision-tile on" : "vision-tile"}
            aria-pressed={p.mascotOn}
            onClick={() => {
              const on = !p.mascotOn;
              p.setMascotOn(on);
              saveMascot(on);
            }}
          >
            <span className="vision-copy">
              <span className="vision-title">Show mascot</span>
              <span className="vision-blurb">Corner art · off by default</span>
            </span>
            <span className="vision-switch" aria-hidden="true">
              <span className="vision-knob" />
            </span>
          </button>
          <button
            type="button"
            className={p.hexModule ? "vision-tile on" : "vision-tile"}
            aria-pressed={p.hexModule}
            onClick={() => {
              const on = !p.hexModule;
              p.setHexModule(on);
              saveHexModule(on);
              if (!on && p.bagTab === "stakes") p.setBagTab("tokens");
            }}
          >
            <span className="vision-copy">
              <span className="vision-title">HEX stakes</span>
              <span className="vision-blurb">Stakes tab · liquid HEX stays</span>
            </span>
            <span className="vision-switch" aria-hidden="true">
              <span className="vision-knob" />
            </span>
          </button>
        </div>

        <h4 className="settings-section">Vision</h4>
        <div className="vision-grid" role="group" aria-label="Vision impaired">
          {(
            [
              {
                key: "largeText" as const,
                title: t("a11yLargerText"),
                blurb: t("a11yLargerTextBlurb"),
              },
              {
                key: "highContrast" as const,
                title: t("a11yHighContrast"),
                blurb: t("a11yHighContrastBlurb"),
              },
              {
                key: "reduceMotion" as const,
                title: t("a11yCalmMotion"),
                blurb: t("a11yCalmMotionBlurb"),
              },
              {
                key: "strongFocus" as const,
                title: t("a11yFocusRing"),
                blurb: t("a11yFocusRingBlurb"),
              },
            ] as const
          ).map((opt) => {
            const on = p.a11y[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                className={on ? "vision-tile on" : "vision-tile"}
                aria-pressed={on}
                onClick={() => p.patchA11y({ [opt.key]: !on })}
              >
                <span className="vision-copy">
                  <span className="vision-title">{opt.title}</span>
                  <span className="vision-blurb">{opt.blurb}</span>
                </span>
                <span className="vision-switch" aria-hidden="true">
                  <span className="vision-knob" />
                </span>
              </button>
            );
          })}
        </div>

        <AiPolicyPanel />

        <details
          className="gas-details settings-fold"
          open={labOpen}
          onToggle={(e) => setLabOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary>Lab &amp; power tools</summary>
          <p className="muted fee">
            Official emu — same wire as a real device. Not a software wallet.
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="btn ghost"
              disabled={labBusy}
              onClick={() => {
                setLabBusy(true);
                void probeLabUserEnv()
                  .then(setLab)
                  .finally(() => setLabBusy(false));
              }}
            >
              {labBusy ? "Probing…" : "Probe lab"}
            </button>
          </div>
          {lab ? (
            <p
              className={lab.controller === "ok" ? "muted fee" : "warn-line"}
              role="status"
            >
              {lab.detail}
            </p>
          ) : null}
          <details className="gas-details">
            <summary>Lab checklist</summary>
            <ol className="muted fee">
              {LAB_USER_ENV_CHECKLIST.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </details>

          <h4 className="settings-section">Dry-run (Temper)</h4>
          <label className="field">
            Temper URL
            <input
              value={temperDraft}
              onChange={(e) => setTemperDraft(e.target.value)}
              placeholder="http://127.0.0.1:8080"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <div className="settings-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                saveTemperBaseUrl(temperDraft);
                setTemperDraft(loadTemperBaseUrl());
              }}
            >
              Save Temper URL
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                saveTemperBaseUrl(temperDraft);
                setTemperDraft(loadTemperBaseUrl());
                void temperStatus({ baseUrl: loadTemperBaseUrl() }).then((s) => {
                  window.alert(s.detail);
                });
              }}
            >
              Probe Temper
            </button>
          </div>
          <p className="muted fee">
            Optional self-host. Dry-run uses it when up; else one-shot eth_call.
          </p>

          <h4 className="settings-section">Injected provider</h4>
          <button
            type="button"
            className={p.injectEth ? "vision-tile on" : "vision-tile"}
            aria-pressed={p.injectEth}
            onClick={() => {
              p.setInjectEth((on) => {
                const next = !on;
                saveInjectEth(next);
                return next;
              });
            }}
          >
            <span className="vision-copy">
              <span className="vision-title">window.ethereum (this tab)</span>
              <span className="vision-blurb">
                Chainlist Add + lab inject. Cross-site → MV3 extension.
              </span>
            </span>
            <span className="vision-switch" aria-hidden="true">
              <span className="vision-knob" />
            </span>
          </button>
        </details>
      </div>
    </div>
  );
}
