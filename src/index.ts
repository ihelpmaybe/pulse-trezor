/** Public embed surface — mount in other Pulse apps. */
export { PulseTrezor, type PulseTrezorProps } from "./PulseTrezor";
export {
  resolveRpcUrl,
  DESK_CHAIN_IDS,
  isDeskChainId,
  chainLabel,
  parseChainRef,
  type DeskChainId,
  type RpcOverride,
} from "./chain/client";
export {
  ensureTrezorInit,
  warmTrezorConnect,
  connectTrezorFromGesture,
  probeSuite,
  humanTrezorError,
  TrezorConnect,
} from "./trezor/connect";
export {
  sendPlsWithTrezor,
  previewFees,
  bumpFees,
  loadBroadcastMeta,
  type BroadcastResult,
  type FeeOverride,
} from "./trezor/signPulseTx";
export { ethAddressPath, SCHEME_ID } from "./trezor/paths";
export {
  loadAiPrefs,
  saveAiPrefs,
  publishAiBridge,
  bootAiPolicy,
  assertCapability,
  isCapabilityAllowed,
  registerAgentHandlers,
  AgentPolicyError,
  type AiPrefs,
  type AiCapability,
  type PulsePerchAiBridge,
  type AgentTxDraft,
} from "./ai/hooks";
export { AiPolicyPanel } from "./ai/AiPolicyPanel";
export {
  PulsePerchProvider,
  attachInjectedProvider,
  detachInjectedProvider,
  getInjectedProvider,
  ProviderRpcError,
  type InjectedHost,
  type Eip1193Request,
} from "./provider/eip1193";
export {
  signPersonalMessage,
  signTypedData,
  parseTypedDataParams,
  type Eip712TypedData,
} from "./trezor/signMessage";
