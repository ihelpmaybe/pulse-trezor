/**
 * Fine-print footer — core links live under SW (Other software).
 */
import { t } from "../i18n/en";

/** Official core + scan + PUMP.tires — no GoPulse. Used by OtherSoftwareModal. */
export const FOOTER_CORE_IDS = [
  "pulsechain",
  "hex",
  "pulsex",
  "provex",
  "bridge",
  "pump-tires",
  "scan",
] as const;

export function CoreFooter() {
  return (
    <footer className="core-footer">
      <p className="core-footer-boast">{t("noCollect")}</p>
    </footer>
  );
}
