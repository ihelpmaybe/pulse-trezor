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
import { InstallPwa } from "./InstallPwa";
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
  privacyHide: boolean;
  togglePrivacyHide: () => void;
  a11y: A11yPrefs;
  patchA11y: (partial: Partial<A11yPrefs>) => void;
  injectEth: boolean;
  setInjectEth: Dispatch<SetStateAction<boolean>>;
};

export function SettingsModal(p: Props) {
  const [temperDraft, setTemperDraft] = useState(() => loadTemperBaseUrl());
  const [lab, setLab] = useState<LabUserEnvStatus | null>(null);
  const [labBusy, setLabBusy] = useState(false);
  return (
    <div
      className="rpc-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) p.onClose();
      }}
    >
      <div
        className="rpc-modal"
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
          Pulse Perch desk · v0.1.0 · no telemetry · hardware path only · vibe
          coded, device-tested
        </p>
        <p className="muted fee">
          <button
            type="button"
            className="link"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              font: "inherit",
            }}
            onClick={p.onOpenFaq}
          >
            Open FAQ
          </button>
          {" — how to use this app"}
        </p>
        <p className="muted fee">
          <a
            className="link"
            href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/status.md"
            target="_blank"
            rel="noreferrer"
          >
            What works today
          </a>
          {" · "}
          <a
            className="link"
            href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/suite-connect.md"
            target="_blank"
            rel="noreferrer"
          >
            Suite + Connect
          </a>
          {" · "}
          <a
            className="link"
            href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/pls-on-trezor.md"
            target="_blank"
            rel="noreferrer"
          >
            PLS on Trezor
          </a>
          {" · "}
          <a
            className="link"
            href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/provex.md"
            target="_blank"
            rel="noreferrer"
          >
            ProveX
          </a>
        </p>
        <p className="muted fee">
          <a
            className="link"
            href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/migrate-from-eth.md"
            target="_blank"
            rel="noreferrer"
          >
            Migrate from ETH
          </a>
          {" · "}
          <a
            className="link"
            href="https://github.com/ihelpmaybe/pulse-trezor/blob/main/docs/UNINSTALL-METAMASK-FOR-PULSE.md"
            target="_blank"
            rel="noreferrer"
          >
            Uninstall MetaMask
          </a>
          {" · "}
          <a
            className="link"
            href="https://suite.trezor.io"
            target="_blank"
            rel="noreferrer"
          >
            Trezor Suite
          </a>
          {" · "}
          <a
            className="link"
            href="https://bridge.pulsechain.com"
            target="_blank"
            rel="noreferrer"
          >
            Pulse Bridge
          </a>
        </p>
        <p className="muted fee">
          Updates: rebuild / refresh this desk (PWA may need a hard refresh if
          the shell sticks). No auto-updater yet — that’s fine for now.
        </p>

        <h4 className="settings-section">Install</h4>
        <InstallPwa />

        <h4 className="settings-section">Device</h4>
        <p className="muted fee">
          Suite:{" "}
          {p.suiteChannel === "desktop"
            ? "Desktop (connect-ws)"
            : p.suiteChannel === "web-or-missing"
              ? "Desktop not detected — use Suite Web or start Desktop"
              : "checking…"}
          {p.deviceHints?.firmware
            ? ` · FW ${p.deviceHints.firmware}${p.deviceHints.outdated ? " (outdated)" : ""}`
            : ""}
          {p.deviceHints?.passphraseProtection ? " · passphrase on" : ""}
        </p>
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

        <h4 className="settings-section">Bag data</h4>
        <p className="muted fee">
          Balances, activity, and HEX stakes stay on this PC after you close the
          desk. Cheap refresh on open; stake rows reuse the cache when the count
          has not changed. Download a file to move machines, or clear when you
          want this browser wiped.
        </p>
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
        {p.rpcSelectValue === "__custom__" ? (
          <>
            <label className="field">
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
          </>
        ) : null}
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
        <p className="muted fee">
          How often Perch pings the node for the latency chip. Off = once when
          the desk loads or RPC changes.
        </p>

        <h4 className="settings-section">Lab (trezor-user-env)</h4>
        <p className="muted fee">
          Official emu — same wire as a real device (Connect → Suite → Bridge/emu).
          Not a software wallet.
        </p>
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
        {lab ? (
          <p
            className={lab.controller === "ok" ? "muted fee" : "warn-line"}
            role="status"
          >
            {lab.detail}
          </p>
        ) : null}
        <details className="settings">
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
        <div className="row gap">
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
          Optional self-host — EnsoBuild/Temper (+ Anvil fork via{" "}
          <code>scripts/temper-pulse.ps1</code>). Dry-run uses it when up; else
          one-shot RPC eth_call (no portfolio polling).
        </p>

        <h4 className="settings-section">Display</h4>
        <label className="hide-zero">
          <input
            type="checkbox"
            checked={p.theme === "light"}
            onChange={(e) => {
              const next: ThemePref = e.target.checked ? "light" : "dark";
              p.setTheme(next);
              applyTheme(next);
            }}
          />
          {t("lightTheme")}
        </label>
        <label className="hide-zero">
          <input
            type="checkbox"
            checked={p.mascotOn}
            onChange={(e) => {
              const on = e.target.checked;
              p.setMascotOn(on);
              saveMascot(on);
            }}
          />
          Show mascot
        </label>
        <p className="muted fee">
          Corner anime perch art. Off by default — turn on if you want her.
        </p>

        <h4 className="settings-section">Modules</h4>
        <label className="hide-zero">
          <input
            type="checkbox"
            checked={p.hexModule}
            onChange={(e) => {
              const on = e.target.checked;
              p.setHexModule(on);
              saveHexModule(on);
              if (!on && p.bagTab === "stakes") p.setBagTab("tokens");
            }}
          />
          HEX stakes
        </label>
        <p className="muted fee">
          Shows Stakes tab and “has stakes” marks. Liquid HEX in Tokens stays
          either way. Off by default — lean face.
        </p>

        <h4 className="settings-section">Privacy</h4>
        <button
          type="button"
          className={p.privacyHide ? "vision-tile on" : "vision-tile"}
          aria-pressed={p.privacyHide}
          onClick={p.togglePrivacyHide}
        >
          <span className="vision-copy">
            <span className="vision-title">Dox shield</span>
            <span className="vision-blurb">
              Mask addresses &amp; amounts as ******** (screen share)
            </span>
          </span>
          <span className="vision-switch" aria-hidden="true">
            <span className="vision-knob" />
          </span>
        </button>

        <h4 className="settings-section">Vision impaired</h4>
        <div className="vision-grid" role="group" aria-label="Vision impaired">
          {(
            [
              {
                key: "largeText" as const,
                title: "Larger text",
                blurb: "Bump type size",
              },
              {
                key: "highContrast" as const,
                title: "High contrast",
                blurb: "Brighter type & edges",
              },
              {
                key: "reduceMotion" as const,
                title: "Calm motion",
                blurb: "Kill animations",
              },
              {
                key: "strongFocus" as const,
                title: "Focus ring",
                blurb: "Thicker keyboard outline",
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
              Lab this-tab inject. Cross-site dapps use the sideload MV3 extension.
            </span>
          </span>
          <span className="vision-switch" aria-hidden="true">
            <span className="vision-knob" />
          </span>
        </button>
      </div>
    </div>
  );
}
