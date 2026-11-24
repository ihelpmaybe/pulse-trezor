/**
 * Right-click menu for account notes.
 * Portaled to body so bag/device card stacking cannot cover it.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type AccountNoteMenuState = {
  address: string;
  derivationIndex: number;
  x: number;
  y: number;
  hasNote: boolean;
};

type Props = {
  menu: AccountNoteMenuState;
  onAddOrEdit: () => void;
  onClear: () => void;
  onCopyAddress: () => void;
  onClose: () => void;
};

export function AccountNoteMenu({
  menu,
  onAddOrEdit,
  onClear,
  onCopyAddress,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const left = Math.min(menu.x, window.innerWidth - 180);
  const top = Math.min(menu.y, window.innerHeight - 160);

  return createPortal(
    <div
      ref={ref}
      className="acct-note-menu"
      role="menu"
      aria-label={`Notes for slot ${menu.derivationIndex}`}
      style={{ left, top }}
    >
      <button
        type="button"
        role="menuitem"
        className="acct-note-item"
        onClick={onAddOrEdit}
      >
        {menu.hasNote ? "Edit note" : "Add note"}
      </button>
      <button
        type="button"
        role="menuitem"
        className="acct-note-item"
        disabled={!menu.hasNote}
        onClick={onClear}
      >
        Clear note
      </button>
      <button
        type="button"
        role="menuitem"
        className="acct-note-item"
        onClick={onCopyAddress}
      >
        Copy address
      </button>
    </div>,
    document.body,
  );
}
