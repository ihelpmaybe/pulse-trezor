/**
 * EIP-681 pay / receive URIs for PulseChain.
 * https://eips.ethereum.org/EIPS/eip-681
 */
import type { Address } from "viem";
import type { DeskChainId } from "./client";

/** Receive: ethereum:0x…@chainId */
export function eip681Receive(address: Address, chainId: DeskChainId): string {
  return `ethereum:${address}@${chainId}`;
}

/** Pay native: ethereum:0x…@chainId?value=Wei */
export function eip681PayNative(
  address: Address,
  chainId: DeskChainId,
  valueWei: bigint,
): string {
  return `ethereum:${address}@${chainId}?value=${valueWei.toString()}`;
}

/** ERC-20 transfer request (amount in smallest units). */
export function eip681PayToken(
  token: Address,
  chainId: DeskChainId,
  to: Address,
  amountRaw: bigint,
): string {
  return `ethereum:${token}@${chainId}/transfer?address=${to}&uint256=${amountRaw.toString()}`;
}
