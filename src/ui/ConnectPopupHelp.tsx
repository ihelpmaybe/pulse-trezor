/**
 * Make Trezor Suite Connect a deliberate click — Chrome blocks about:blank
 * unless window.open runs under user-activation.
 */
import { t } from "../i18n/en";
import { isPopupBlockedError } from "../trezor/errors";

type Props = {
  err?: string | null;
  /** Show the Connect Trezor Suite CTA before a session exists. */
  showCta?: boolean;
  connecting?: boolean;
  warm?: boolean;
  onConnect: () => void;
};

export function ConnectPopupHelp({
  err,
  showCta = false,
  connecting = false,
  warm = true,
  onConnect,
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
          disabled={connecting || !warm}
          onClick={onConnect}
        >
          {connecting
            ? t("waitingOnSuite")
            : !warm
              ? t("preparingSuiteLink")
              : t("connectTrezorSuite")}
        </button>
      </div>
    );
  }

  if (!showCta) return null;

  return (
    <div className="suite-allow-callout connect-popup-help" role="region">
      <p className="suite-allow-callout-title">{t("connectTrezorSuite")}</p>
      <p className="suite-allow-callout-body">{t("connectTrezorSuiteBody")}</p>
      <button
        type="button"
        className="btn"
        disabled={connecting || !warm}
        onClick={onConnect}
      >
        {connecting
          ? t("waitingOnSuite")
          : !warm
            ? t("preparingSuiteLink")
            : t("connectTrezorSuite")}
      </button>
      <p className="muted fee suite-allow-callout-hint">{t("connectTrezorSuiteHint")}</p>
    </div>
  );
}
