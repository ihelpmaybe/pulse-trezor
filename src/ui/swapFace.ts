import type { Address } from "viem";
import type { SwapAsset } from "../chain/pulsex";

/** Drop trailing zeros from formatGwei for input fields. */
export function trimGwei(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

export const SWAP_FACE: { id: SwapAsset; label: string }[] = [
  { id: "PLS", label: "PLS" },
  {
    id: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as Address,
    label: "HEX",
  },
  {
    id: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as Address,
    label: "PLSX",
  },
  {
    id: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d" as Address,
    label: "INC",
  },
  {
    id: "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07" as Address,
    label: "USDC",
  },
];

export function swapAssetLabel(a: SwapAsset): string {
  if (a === "PLS") return "PLS";
  const hit = SWAP_FACE.find(
    (x) => typeof x.id === "string" && x.id.toLowerCase() === a.toLowerCase(),
  );
  return hit?.label ?? `${String(a).slice(0, 6)}…`;
}

export const BRIDGED_USDC =
  "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07" as Address;
export const INHERITED_USDC =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
