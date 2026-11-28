/**
 * Chrome blocks Trezor Connect's window.open('about:blank') when it is not
 * tied to a clear click — explain that and offer a user-gesture retry.
 */
import { t } from "../i18n/en";
import { isPopupBlockedError } from "../trezor/errors";

type Props = {
  /** Current face error — when popup-blocked, show the strong callout. */
  err?: string | null;
  /** Soft tip before first Connect (no session yet). */
  showTip?: boolean;
  connecting?: boolean;
  onRetryConnect: () => void;
};

export function ConnectPopupHelp({
  err,
  showTip = false,
  connecting = false,
  onRetryConnect,
}: Props) {
  const blocked = isPopupBlockedError(err);

  if (blocked) {
    return (
      <div className="suite-allow-callout connect-popup-help" role="alert">
        <p className="suite-allow-callout-title">{t("popupBlockedTitle")}</p>
        <p className="suite-allow-callout-body">{t("popupBlockedBody")}</p>
        <ol className="connect-popup-steps muted fee">
          <li>{t("popupBlockedStep1")}</li>
          <li>{t("popupBlockedStep2")}</li>
          <li>{t("popupBlockedStep3")}</li>
        </ol>
        <button
          type="button"
          className="btn"
          disabled={connecting}
          onClick={onRetryConnect}
        >
          {connecting ? t("waitingOnSuite") : t("openTrezorWindow")}
        </button>
      </div>
    );
  }

  if (!showTip) return null;

  return (
    <p className="muted fee connect-popup-tip" role="note">
      {t("popupTip")}
    </p>
  );
}
