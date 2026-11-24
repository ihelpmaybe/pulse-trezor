/**
 * Popup matrix — pick a shape × color mark for a wallet.
 * Portaled to body so sibling cards cannot cover it.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ACCOUNT_MARK_COLORS,
  ACCOUNT_MARK_SHAPES,
  type AccountMark,
  type AccountMarkColorId,
  type AccountMarkShape,
} from "../chain/accountMarks";
import { AccountMarkIcon } from "./AccountMarkIcon";

type Props = {
  accountLabel: string;
  current: AccountMark | null;
  onPick: (mark: AccountMark) => void;
  onClear: () => void;
  onClose: () => void;
};

export function AccountMarkPicker({
  accountLabel,
  current,
  onPick,
  onClear,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("button.acct-mark-cell")?.focus();
  }, []);

  return createPortal(
    <div
      className="acct-mark-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="acct-mark-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Mark for ${accountLabel}`}
        ref={panelRef}
      >
        <div className="acct-mark-head">
          <h3>Mark {accountLabel}</h3>
          <button
            type="button"
            className="btn ghost rpc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="muted fee">Pick a shape and color so this wallet is easy to spot.</p>
        <div
          className="acct-mark-matrix"
          role="grid"
          aria-label="Shape and color matrix"
        >
          {ACCOUNT_MARK_SHAPES.map((shape) => (
            <div key={shape} className="acct-mark-row" role="row">
              {ACCOUNT_MARK_COLORS.map((c) => {
                const mark: AccountMark = {
                  shape: shape as AccountMarkShape,
                  color: c.id as AccountMarkColorId,
                };
                const selected =
                  current?.shape === mark.shape && current?.color === mark.color;
                return (
                  <button
                    key={`${shape}-${c.id}`}
                    type="button"
                    role="gridcell"
                    className={
                      selected ? "acct-mark-cell on" : "acct-mark-cell"
                    }
                    aria-label={`${shape} ${c.id}`}
                    aria-pressed={selected}
                    onClick={() => onPick(mark)}
                  >
                    <AccountMarkIcon mark={mark} size={16} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn ghost"
            disabled={!current}
            onClick={onClear}
          >
            Clear mark
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
