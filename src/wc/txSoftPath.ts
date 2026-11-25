/**
 * Soft-path coaching for WC eth_sendTransaction — no mainnet dust required.
 * Separates “wallet path works” from “hash landed”.
 */
import { t } from "../i18n/en";

/** Face hint while a send-tx request is open. */
export function wcSendTxCoach(): string {
  return t("wcTxCoach");
}

/**
 * Map raw sign/broadcast failures to honest soft-path copy.
 * Returns null when the raw message should stay as-is.
 */
export function softenWcSendError(raw: string): string | null {
  const s = raw.toLowerCase();
  if (
    /insufficient|not enough|balance|funds|gas required exceeds|intrinsic gas/i.test(
      s,
    )
  ) {
    return t("wcTxSoftInsufficient");
  }
  if (
    /confirm on|waiting on suite|popup closed|method_cancel|permissionsnotgranted|user.?denied|actioncancelled|failure_actioncancelled/i.test(
      s,
    ) ||
    (/cancel|reject|denied/i.test(s) && /suite|trezor|device/i.test(s))
  ) {
    return t("wcTxSoftConfirm");
  }
  return null;
}
