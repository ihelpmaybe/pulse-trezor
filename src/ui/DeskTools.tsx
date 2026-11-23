/**
 * FAQ / other software / privacy eye / settings — top-right desk chrome.
 */
import type { RefObject } from "react";

type Props = {
  faqOpen: boolean;
  onOpenFaq: () => void;
  softwareOpen: boolean;
  onOpenSoftware: () => void;
  privacyHide: boolean;
  togglePrivacyHide: () => void;
  showSettings: boolean;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  settingsBtnRef: RefObject<HTMLButtonElement | null>;
};

export function DeskTools({
  faqOpen,
  onOpenFaq,
  softwareOpen,
  onOpenSoftware,
  privacyHide,
  togglePrivacyHide,
  showSettings,
  settingsOpen,
  onOpenSettings,
  settingsBtnRef,
}: Props) {
  return (
    <div className="rpc-pop-wrap desk-tools">
      <button
        type="button"
        className={faqOpen ? "btn ghost rpc-pop-btn on" : "btn ghost rpc-pop-btn"}
        aria-haspopup="dialog"
        aria-expanded={faqOpen}
        aria-label="Frequently asked questions"
        title="FAQ — how to use Perch"
        onClick={onOpenFaq}
      >
        <span className="faq-btn-label" aria-hidden="true">
          ?
        </span>
      </button>
      <button
        type="button"
        className={
          softwareOpen ? "btn ghost rpc-pop-btn on" : "btn ghost rpc-pop-btn"
        }
        aria-haspopup="dialog"
        aria-expanded={softwareOpen}
        aria-label="Other software"
        title="Other software — Pulse apps, soft wallets & Suite"
        onClick={onOpenSoftware}
      >
        <span className="faq-btn-label software-btn-label" aria-hidden="true">
          SW
        </span>
      </button>
      <button
        type="button"
        className={
          privacyHide
            ? "btn ghost rpc-pop-btn privacy-btn on"
            : "btn ghost rpc-pop-btn privacy-btn"
        }
        aria-pressed={privacyHide}
        title={
          privacyHide
            ? "Show addresses & amounts"
            : "Hide addresses & amounts (********)"
        }
        aria-label={
          privacyHide
            ? "Show addresses and amounts"
            : "Hide addresses and amounts"
        }
        onClick={togglePrivacyHide}
      >
        {privacyHide ? (
          <svg
            className="privacy-eye"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.5 11.5 0 0 1-4.2 5.1M6.6 6.6A11.4 11.4 0 0 0 1 12.5C2.7 16.9 7 20 12 20a10.5 10.5 0 0 0 4.3-.9"
            />
          </svg>
        ) : (
          <svg
            className="privacy-eye"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 12.5C3.7 8.1 7.9 5 12 5s8.3 3.1 10 7.5c-1.7 4.4-5.9 7.5-10 7.5S3.7 16.9 2 12.5z"
            />
            <circle
              cx="12"
              cy="12.5"
              r="3"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        )}
      </button>
      {showSettings ? (
        <button
          type="button"
          ref={settingsBtnRef}
          className={
            settingsOpen ? "btn ghost rpc-pop-btn on" : "btn ghost rpc-pop-btn"
          }
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          aria-label="Settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <svg
            className="settings-gear"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
