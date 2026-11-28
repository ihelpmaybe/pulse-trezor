/**
 * Chrome's own "Pop-ups blocked / about:blank" dialog cannot be customized.
 * This face is the context users need so that dialog isn't terrifying.
 */
import { t } from "../i18n/en";
import { isPopupBlockedError } from "../trezor/errors";

type Props = {
  err?: string | null;
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

  if (!showCta && !blocked) return null;

  return (
    <div
      className={
        blocked
          ? "suite-allow-callout connect-popup-help connect-popup-help-blocked"
          : "suite-allow-callout connect-popup-help"
      }
      role={blocked ? "alert" : "region"}
    >
      <p className="suite-allow-callout-title">
        {blocked ? t("popupBlockedTitle") : t("connectTrezorSuite")}
      </p>

      <p className="suite-allow-callout-body">{t("chromePopupExplain")}</p>

      <ul className="connect-popup-facts muted fee">
        <li>{t("chromePopupFactWallet")}</li>
        <li>{t("chromePopupFactBlank")}</li>
        <li>{t("chromePopupFactAllow")}</li>
        <li>{t("chromePopupFactSafe")}</li>
      </ul>

      {blocked ? (
        <ol className="connect-popup-steps muted fee">
          <li>{t("popupBlockedStep1")}</li>
          <li>{t("popupBlockedStep2")}</li>
          <li>{t("popupBlockedStep3")}</li>
        </ol>
      ) : null}

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

      <p className="muted fee suite-allow-callout-hint">
        {blocked ? t("connectTrezorSuiteHint") : t("chromePopupBeforeClick")}
      </p>
    </div>
  );
}
