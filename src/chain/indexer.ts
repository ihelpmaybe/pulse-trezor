/**
 * PulseScan bases from pulse-core indexer pack (SYNC7) — no hardcode drift.
 */
import indexer from "../pack/indexer.json";
import type { DeskChainId } from "./client";

export type IndexerProvider = (typeof indexer.providers)[number];

export function indexerProvider(chainId: DeskChainId): IndexerProvider | null {
  return indexer.providers.find((p) => p.chainId === chainId) ?? null;
}

/** Blockscout API origin for Activity / bag / approvals. */
export function scanApiFromIndexer(chainId: DeskChainId): string | null {
  const u = indexerProvider(chainId)?.apiUrl?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

export function scanUiFromIndexer(chainId: DeskChainId): string | null {
  const u = indexerProvider(chainId)?.uiUrl?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

export { indexer };
