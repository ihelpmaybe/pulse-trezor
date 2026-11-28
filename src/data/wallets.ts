/**
 * Donation destinations — edit carefully; a wrong paste sends money to the wrong wallet.
 * Keep in lockstep with vault `memory/crypto/donation-addresses.json` (project-tip-jar).
 */

function assertPulseAddress(address: string, name: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(
      `[wallets] Invalid ${name} address — fix src/data/wallets.ts before shipping.`,
    );
  }
}

/** Footer tip jar — same Pulse address as Just The Tip / Sell School. */
export const FOOTER_DONATION = {
  labelKey: "donateLabel" as const,
  address: "0x64fB4919D9336a059cbD5F4428E319d0F232F64d",
} as const;

assertPulseAddress(FOOTER_DONATION.address, "Footer donation");
