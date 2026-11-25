/**
 * ETH BIP44 path: m/44'/60'/account'/change/N
 * Fixed: m · 44' · 60'. Knobs: account' · change · N (wallet slot).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFocusable, trapTabKey } from "../a11y/focusTrap";
import { t } from "../i18n/en";
import { DEFAULT_PATH_TEMPLATE } from "../trezor/paths";
import { ACCOUNT_INDEX_MAX } from "./faceFormat";
import { saveAccountIndex } from "./deskStorage";

type Props = {
  open: boolean;
  onClose: () => void;
  connecting: boolean;
  /** 0-based BIP44 address index (slot 0 = first wallet). */
  accountIndex: number;
  setAccountIndex: (i: number) => void;
  pathTemplate?: string;
  /** Persist template when account' / change knobs move. */
  applyPathTemplate: (template: string) => void;
  /** Load exactly this address index under the saved template. */
  onLoadOne: (index: number) => void;
};

/** BIP44 change level: 0 or 1. */
export const CHANGE_MAX = 1;

/** Build MetaMask-style template with `{i}` for bulk Load under this branch. */
export function buildEthPathTemplate(account: number, change: number): string {
  const a = Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Math.floor(account)));
  const c = Math.max(0, Math.min(CHANGE_MAX, Math.floor(change)));
  return `m/44'/60'/${a}'/${c}/{i}`;
}

function buildTemplate(account: number, change: number): string {
  return buildEthPathTemplate(account, change);
}

/** Read account' + change from a Perch ETH template. */
export function parseEthPathKnobs(template: string): {
  account: number;
  change: number;
} {
  const m = template
    .trim()
    .match(/^m\/44'\/60'\/(\d+)'\/(\d+)\/(?:\{i\}|\d+)$/);
  if (!m) return { account: 0, change: 0 };
  return {
    account: Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Number(m[1]) || 0)),
    change: Math.max(0, Math.min(CHANGE_MAX, Number(m[2]) || 0)),
  };
}

function PathTicker({
  value,
  min,
  max,
  disabled,
  ariaLabel,
  title,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  ariaLabel: string;
  title?: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function clamp(n: number) {
    return Math.max(min, Math.min(max, Math.floor(n)));
  }

  function commit(n: number) {
    const i = clamp(n);
    setDraft(i);
    onCommit(i);
  }

  return (
    <div className="path-bip-ticker">
      <button
        type="button"
        className="btn ghost path-seg-arrow"
        disabled={disabled || draft >= max}
        aria-label={`${ariaLabel} up`}
        onClick={() => commit(draft + 1)}
      >
        ▲
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        value={draft}
        aria-label={ariaLabel}
        title={title}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          setDraft(clamp(n));
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          }
        }}
      />
      <button
        type="button"
        className="btn ghost path-seg-arrow"
        disabled={disabled || draft <= min}
        aria-label={`${ariaLabel} down`}
        onClick={() => commit(draft - 1)}
      >
        ▼
      </button>
    </div>
  );
}

export function PathModal({
  open,
  onClose,
  connecting,
  accountIndex,
  setAccountIndex,
  pathTemplate = DEFAULT_PATH_TEMPLATE,
  applyPathTemplate,
  onLoadOne,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const knobs = parseEthPathKnobs(pathTemplate);
  const [account, setAccount] = useState(knobs.account);
  const [change, setChange] = useState(knobs.change);
  const [slot, setSlot] = useState(accountIndex);

  useEffect(() => {
    if (!open) return;
    const k = parseEthPathKnobs(pathTemplate);
    setAccount(k.account);
    setChange(k.change);
    setSlot(accountIndex);
  }, [open, pathTemplate, accountIndex]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const root: HTMLElement = panel;
    const previously = document.activeElement as HTMLElement | null;
    getFocusable(root)[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else trapTabKey(e, root);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previously?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  function commitSlot(n: number) {
    const i = Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Math.floor(n)));
    setSlot(i);
    setAccountIndex(i);
    saveAccountIndex(i);
  }

  function commitBranch(nextAccount: number, nextChange: number) {
    const a = Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Math.floor(nextAccount)));
    const c = Math.max(0, Math.min(CHANGE_MAX, Math.floor(nextChange)));
    setAccount(a);
    setChange(c);
    applyPathTemplate(buildTemplate(a, c));
  }

  return createPortal(
    <div
      className="rpc-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rpc-modal path-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("pathDerivation")}
        ref={panelRef}
      >
        <div className="rpc-modal-head">
          <h3>{t("pathDerivation")}</h3>
          <button
            type="button"
            className="btn ghost rpc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="muted fee path-teach">
          <code>m/44'/60'</code> stays ETH BIP44. Turn{" "}
          <strong>account'</strong>, <strong>change</strong>, and the last slot
          to reach other wallet branches (recovery). MetaMask-style day-to-day
          is <code>…/0'/0/N</code>.
        </p>

        <div
          className="path-bip-row"
          role="group"
          aria-label="BIP44 path m/44'/60'/account'/change/N"
        >
          <span className="path-bip-chunk">
            <span className="path-bip-fixed">m</span>
          </span>
          <span className="path-bip-slash">/</span>
          <span className="path-bip-chunk">
            <span className="path-bip-fixed">44'</span>
          </span>
          <span className="path-bip-slash">/</span>
          <span className="path-bip-chunk">
            <span className="path-bip-fixed">60'</span>
          </span>
          <span className="path-bip-slash">/</span>
          <PathTicker
            value={account}
            min={0}
            max={ACCOUNT_INDEX_MAX}
            disabled={connecting}
            ariaLabel={t("pathAccountBranch")}
            title="Account' — different wallet family (Ledger Live bumps this)"
            onCommit={(n) => commitBranch(n, change)}
          />
          <span className="path-bip-fixed path-bip-hard">'</span>
          <span className="path-bip-slash">/</span>
          <PathTicker
            value={change}
            min={0}
            max={CHANGE_MAX}
            disabled={connecting}
            ariaLabel={t("pathChangeBranch")}
            title="Change — 0 or 1; another set of slots under this account"
            onCommit={(n) => commitBranch(account, n)}
          />
          <span className="path-bip-slash">/</span>
          <PathTicker
            value={slot}
            min={0}
            max={ACCOUNT_INDEX_MAX}
            disabled={connecting}
            ariaLabel={t("pathWalletSlot")}
            title="Address index — MetaMask / Perch wallet slot"
            onCommit={commitSlot}
          />
        </div>

        <div className="path-modal-actions">
          <button
            type="button"
            className="btn ghost"
            disabled={
              connecting || (account === 0 && change === 0 && slot === 0)
            }
            onClick={() => {
              commitBranch(0, 0);
              commitSlot(0);
            }}
          >
            {t("pathReset")}
          </button>
          <button
            type="button"
            className="btn"
            disabled={connecting}
            title={t("pathSaveTitle")}
            onClick={() => {
              // Flush typed drafts (blur alone may not have run if Done was clicked).
              const inputs = panelRef.current
                ? Array.from(
                    panelRef.current.querySelectorAll<HTMLInputElement>(
                      "input[type=number]",
                    ),
                  )
                : [];
              const [aEl, cEl, sEl] = inputs;
              const a = aEl && Number.isFinite(Number(aEl.value))
                ? Number(aEl.value)
                : account;
              const c = cEl && Number.isFinite(Number(cEl.value))
                ? Number(cEl.value)
                : change;
              const s = sEl && Number.isFinite(Number(sEl.value))
                ? Number(sEl.value)
                : slot;
              commitBranch(a, c);
              commitSlot(s);
              onClose();
              onLoadOne(s);
            }}
          >
            {t("pathLoadWallet")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
