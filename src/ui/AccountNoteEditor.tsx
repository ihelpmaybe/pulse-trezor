/**
 * Add / edit note for a wallet account.
 * Portaled to body — card z-index stacking must not cover it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACCOUNT_NOTE_MAX } from "../chain/accountNotes";

type Props = {
  accountLabel: string;
  initial: string;
  onSave: (note: string) => void;
  onClose: () => void;
};

export function AccountNoteEditor({
  accountLabel,
  initial,
  onSave,
  onClose,
}: Props) {
  const [text, setText] = useState(initial);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    areaRef.current?.focus();
    areaRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="acct-note-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="acct-note-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Note for ${accountLabel}`}
      >
        <div className="acct-mark-head">
          <h3>Note · {accountLabel}</h3>
          <button
            type="button"
            className="btn ghost rpc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <label className="field">
          Reminder for this wallet
          <textarea
            ref={areaRef}
            className="acct-note-area"
            rows={4}
            maxLength={ACCOUNT_NOTE_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. long HEX stakes — leave alone"
          />
        </label>
        <p className="muted fee">
          {text.trim().length}/{ACCOUNT_NOTE_MAX} · stays on this PC only
        </p>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => onSave(text)}
          >
            Save note
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
