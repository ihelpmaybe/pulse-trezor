/**
 * One-glance first-run path before Connect — connect → bag → optional Sites.
 */
import { t } from "../i18n/en";

type Props = {
  hasSession: boolean;
  onGotoApps?: () => void;
};

export function FirstRunStrip({ hasSession, onGotoApps }: Props) {
  if (hasSession) return null;

  return (
    <div className="first-run-strip" role="note">
      <p className="first-run-strip-title">{t("firstRunTitle")}</p>
      <ol className="first-run-steps">
        <li>{t("firstRunConnect")}</li>
        <li>{t("firstRunBag")}</li>
        <li>
          {t("firstRunApps")}
          {onGotoApps ? (
            <>
              {" "}
              <button type="button" className="linkish" onClick={onGotoApps}>
                {t("openApps")}
              </button>
            </>
          ) : null}
        </li>
      </ol>
    </div>
  );
}
