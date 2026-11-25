/**
 * Valve gas-oracle wrap — slow / standard / fast / instant.
 * PulseChain preset = PriorityModel.flat (extractive validators).
 */
import {
  createGasOracle,
  presetForChainId,
  TierName,
  type TierRecommendation,
} from "@valve-tech/gas-oracle";
import type { PublicClient } from "viem";
import { makePublicClient, type DeskChainId, type RpcOverride } from "./client";

export type GasSpeed = (typeof TierName)[keyof typeof TierName];

export type GasTierFees = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasPrice: bigint;
};

export type GasTiers = Record<GasSpeed, GasTierFees>;

export { TierName };

/**
 * Valve Instant can print million-beat tips on empty/weird Pulse testnet
 * mempools (baseFee in wei). Cap so a ~2 tPLS bag can still afford Instant.
 * 25_000 beats × ~30k gas ≈ 0.75 PLS ceiling.
 */
export const PULSE_TIP_CAP_WEI = 25_000n * 1_000_000_000n;

function slimTier(t: TierRecommendation): GasTierFees {
  return {
    maxFeePerGas: t.maxFeePerGas,
    maxPriorityFeePerGas: t.maxPriorityFeePerGas,
    gasPrice: t.gasPrice,
  };
}

/** Clamp EIP-1559 / legacy tier fees so Instant can't exceed a small bag. */
export function clampGasTierFees(
  fees: GasTierFees,
  tipCapWei: bigint = PULSE_TIP_CAP_WEI,
): GasTierFees {
  const tip =
    fees.maxPriorityFeePerGas > tipCapWei
      ? tipCapWei
      : fees.maxPriorityFeePerGas;
  let max = fees.maxFeePerGas > tipCapWei ? tipCapWei : fees.maxFeePerGas;
  if (max < tip) max = tip;
  const gasPrice =
    fees.gasPrice > tipCapWei ? tipCapWei : fees.gasPrice;
  return {
    maxFeePerGas: max,
    maxPriorityFeePerGas: tip,
    gasPrice: gasPrice > 0n ? gasPrice : tip > 0n ? tip : 1n,
  };
}

export function clampGasTiers(
  tiers: GasTiers,
  tipCapWei: bigint = PULSE_TIP_CAP_WEI,
): GasTiers {
  return {
    slow: clampGasTierFees(tiers.slow, tipCapWei),
    standard: clampGasTierFees(tiers.standard, tipCapWei),
    fast: clampGasTierFees(tiers.fast, tipCapWei),
    instant: clampGasTierFees(tiers.instant, tipCapWei),
  };
}

/**
 * One-shot poll — no background timer left running.
 * Returns null when RPC/oracle can't produce tiers (caller falls back).
 */
export async function fetchGasTiers(
  chainId: DeskChainId,
  rpc?: RpcOverride,
): Promise<GasTiers | null> {
  const client = makePublicClient(chainId, rpc) as PublicClient;
  const preset = presetForChainId(chainId);
  const oracle = createGasOracle({
    client,
    chainId,
    ...(preset
      ? {
          priorityModel: preset.priorityModel,
          priorityFeeDecayCap: preset.priorityFeeDecayCap,
          pollIntervalMs: preset.pollIntervalMs,
          baseFeeParams: preset.baseFeeParams,
        }
      : {}),
    keepMempoolSnapshot: false,
    pauseWhenHidden: true,
  });
  try {
    const state = await oracle.pollOnce();
    if (!state?.tiers?.slow || !state.tiers.standard) return null;
    const raw: GasTiers = {
      slow: slimTier(state.tiers.slow),
      standard: slimTier(state.tiers.standard),
      fast: slimTier(state.tiers.fast),
      instant: slimTier(state.tiers.instant),
    };
    // Pulse 369/943 + any chain: absurd Instant tips still get clamped.
    return clampGasTiers(raw);
  } catch {
    return null;
  } finally {
    try {
      oracle.stop();
    } catch {
      /* ignore */
    }
  }
}

export const GAS_TIER_PILLS: readonly { id: GasSpeed; label: string }[] = [
  { id: "slow", label: "Slow" },
  { id: "standard", label: "Standard" },
  { id: "fast", label: "Fast" },
  { id: "instant", label: "Instant" },
];
