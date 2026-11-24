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

function slimTier(t: TierRecommendation): GasTierFees {
  return {
    maxFeePerGas: t.maxFeePerGas,
    maxPriorityFeePerGas: t.maxPriorityFeePerGas,
    gasPrice: t.gasPrice,
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
    return {
      slow: slimTier(state.tiers.slow),
      standard: slimTier(state.tiers.standard),
      fast: slimTier(state.tiers.fast),
      instant: slimTier(state.tiers.instant),
    };
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
