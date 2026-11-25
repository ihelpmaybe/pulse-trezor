/**
 * Migrate-from-ETH walk as desk product (Advanced mode).
 * Guide text stays in pulse-trezor-guides; this is the clickable checklist.
 */
import { useEffect, useState } from "react";
import type { DeskChainId } from "../chain/client";
import { t } from "../i18n/en";
import {
  loadDeviceAdvanced,
  loadMigrateWalk,
  saveMigrateWalk,
  type MigrateWalkState,
} from "./deskStorage";

const GUIDE =
  "https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/migrate-from-eth.md";
const BRIDGE = "https://bridge.pulsechain.com";
const UNINSTALL_MM =
  "https://github.com/ihelpmaybe/pulse-trezor/blob/main/docs/UNINSTALL-METAMASK-FOR-PULSE.md";

const STEPS: { id: keyof MigrateWalkState; label: string }[] = [
  { id: "suiteReady", label: "Suite open · Perch Connected · address matches device" },
  { id: "onPulse", label: "Network = PulseChain (369), not testnet" },
  { id: "listedAssets", label: "Listed what moves (bridge vs sell-and-rebuy)" },
  { id: "bridged", label: "Bridged to the verified Perch address" },
  { id: "bagOk", label: "Refreshed bag — assets show on Pulse" },
  { id: "approvalsClean", label: "Approvals scanned / revoked after DEX use" },
];

type Props = {
  chainId: DeskChainId;
  canSign: boolean;
  onSwitchPulse: () => void;
  onGotoApprovals: () => void;
};

export function MigratePanel({
  chainId,
  canSign,
  onSwitchPulse,
  onGotoApprovals,
}: Props) {
  const [advanced, setAdvanced] = useState(() => loadDeviceAdvanced());
  const [walk, setWalk] = useState<MigrateWalkState>(() => loadMigrateWalk());

  useEffect(() => {
    const sync = () => setAdvanced(loadDeviceAdvanced());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("pulse-perch-device-advanced", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pulse-perch-device-advanced", sync);
    };
  }, []);

  function patch(partial: Partial<MigrateWalkState>) {
    setWalk((prev) => {
      const next = { ...prev, ...partial };
      saveMigrateWalk(next);
      return next;
    });
  }

  const doneCount = STEPS.filter((s) => walk[s.id]).length;

  if (!advanced) {
    return (
      <div className="apps-card migrate-card">
        <div className="apps-card-head">
          <h3>{t("migrateFromEth")}</h3>
        </div>
        <p className="muted fee">
          Same-address risk + bridge checklist. Turn on{" "}
          <strong>Device → Advanced</strong> for the in-desk walk, or open the{" "}
          <a className="link" href={GUIDE} target="_blank" rel="noreferrer">
            guide
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="apps-card migrate-card migrate-card-advanced">
      <div className="apps-card-head">
        <h3>{t("migrateFromEth")}</h3>
        <span className="muted fee">
          {doneCount}/{STEPS.length}
        </span>
      </div>
      <p className="warn-line">
        BIP44 Account 1 can be the <strong>same address</strong> on ETH and
        Pulse. Soft-wallet leak ≠ “different bag” unless you chose that.
      </p>
      <label className="blind-ack">
        <input
          type="checkbox"
          checked={walk.sameAddrAck}
          onChange={(e) => patch({ sameAddrAck: e.target.checked })}
        />
        <span>
          I understand same-address risk — I’ll verify the receive address on
          Trezor before bridging.
        </span>
      </label>
      {!walk.sameAddrAck ? (
        <p className="muted fee">Ack above to unlock the walk.</p>
      ) : (
        <>
          <ul className="migrate-steps">
            {STEPS.map((s) => (
              <li key={s.id}>
                <label className="blind-ack">
                  <input
                    type="checkbox"
                    checked={!!walk[s.id]}
                    onChange={(e) => patch({ [s.id]: e.target.checked })}
                  />
                  <span>{s.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row revoke-bulk migrate-actions">
            <button
              type="button"
              className="btn ghost gas-pill"
              disabled={chainId === 369}
              onClick={onSwitchPulse}
            >
              {chainId === 369 ? "On 369" : "Switch to 369"}
            </button>
            <button
              type="button"
              className="btn ghost gas-pill"
              disabled={!canSign && chainId !== 369 && chainId !== 943}
              onClick={onGotoApprovals}
            >
              Approvals
            </button>
            <a
              className="btn ghost gas-pill"
              href={BRIDGE}
              target="_blank"
              rel="noreferrer"
            >
              Bridge
            </a>
            <a
              className="btn ghost gas-pill"
              href={GUIDE}
              target="_blank"
              rel="noreferrer"
            >
              Full guide
            </a>
            <a
              className="btn ghost gas-pill"
              href={UNINSTALL_MM}
              target="_blank"
              rel="noreferrer"
            >
              Uninstall MM
            </a>
          </div>
        </>
      )}
    </div>
  );
}
