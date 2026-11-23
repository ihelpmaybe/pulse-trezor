/**
 * Fine-print footer links — modular slice out of PulseTrezor.
 */
import deeplinks from "../pack/deeplinks.json";
import { explorerAddressUrl, type DeskChainId } from "../chain/client";
import { t } from "../i18n/en";

/** Official core + scan + PUMP.tires — no GoPulse. */
export const FOOTER_CORE_IDS = [
  "pulsechain",
  "hex",
  "pulsex",
  "provex",
  "bridge",
  "pump-tires",
  "scan",
] as const;

type Props = {
  activeAddress?: string | null;
  /** Lab chain may be testnet; PulseScan footer link stays mainnet when address known. */
  chainId?: DeskChainId;
};

export function CoreFooter({ activeAddress }: Props) {
  return (
    <footer className="core-footer">
      <div className="core-footer-links">
        {FOOTER_CORE_IDS.map((id) => {
          const item = deeplinks.core.find((c) => c.id === id);
          if (!item) return null;
          const href =
            id === "scan" && activeAddress
              ? explorerAddressUrl(369, activeAddress as `0x${string}`)
              : item.app || item.url;
          if (!href) return null;
          return (
            <a
              key={id}
              className="link"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {item.name}
            </a>
          );
        })}
      </div>
      <p className="core-footer-boast">{t("noCollect")}</p>
    </footer>
  );
}
