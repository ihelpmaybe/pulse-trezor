/**
 * Device session — Connect / Load accounts / watch / Suite probe.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Address } from "viem";
import {
  acquireTrezorDevice,
  cancelTrezorConnect,
  connectTrezorFromGesture,
  detectSuiteChannel,
  getDeviceHints,
  humanTrezorError,
  listTrezorAccountsFromGesture,
  probeSuite,
  resetTrezorInit,
  warmTrezorConnect,
  type DeviceHints,
  type ListedAccount,
  type SuiteChannel,
} from "../trezor/connect";
import {
  loadAccountIndex,
  loadAccountList,
  loadAccountRangeSpec,
  loadPathTemplate,
  loadRpcOverride,
  loadWatch,
  saveAccountIndex,
  saveAccountList,
  savePathTemplate,
  saveWatch,
  type Session,
} from "../ui/deskStorage";
import type { DeskChainId, RpcOverride } from "../chain/client";
import { trimAccountsByPlsGap } from "../trezor/accountGap";
import { ACCOUNT_INDEX_MAX, parseLoadSpec } from "../ui/faceFormat";

type SetErr = Dispatch<SetStateAction<string | null>>;
type SetBusy = Dispatch<SetStateAction<boolean>>;

export function useDeskConnect(opts: {
  setErr: SetErr;
  setBusy: SetBusy;
  chainId: DeskChainId;
  /** Host RPC prop — gap trim also reads user override from storage. */
  rpc?: RpcOverride;
  /** Extra cleanup when forgetting watch (bag / send faces). */
  onForgetExtras?: () => void;
  /** Extra cleanup on disconnect (clear draft send). */
  onDisconnectExtras?: () => void;
}) {
  const { setErr, setBusy, chainId, rpc, onForgetExtras, onDisconnectExtras } =
    opts;

  const [warm, setWarm] = useState(false);
  const [suite, setSuite] = useState<"ok" | "missing" | "unknown" | "…">("…");
  const [connecting, setConnecting] = useState(false);
  const connectGen = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const [watch, setWatch] = useState<Session | null>(() => loadWatch());
  const [accountIndex, setAccountIndex] = useState(() => {
    const w = loadWatch();
    if (w && typeof w.derivationIndex === "number") return w.derivationIndex;
    return loadAccountIndex();
  });
  const [accountList, setAccountList] = useState<ListedAccount[]>(() =>
    loadAccountList(),
  );
  const [accountRange, setAccountRange] = useState(() => loadAccountRangeSpec());
  const accountCount = parseLoadSpec(accountRange)?.span ?? 12;
  const [pathTemplate, setPathTemplateState] = useState(() =>
    loadPathTemplate(),
  );
  const [deviceId, setDeviceId] = useState("trezor-default");
  const [listing, setListing] = useState(false);
  const [suiteChannel, setSuiteChannel] = useState<SuiteChannel>("unknown");
  const [deviceHints, setDeviceHints] = useState<DeviceHints | null>(null);

  const active = session ?? watch;
  const canSign = !!session;

  /** Change BIP44 template — clears listed addresses (must Reload). */
  function applyPathTemplate(next: string) {
    try {
      const saved = savePathTemplate(next);
      setPathTemplateState(saved);
      setAccountList([]);
      saveAccountList([]);
      setSession(null);
      setWatch(null);
      saveWatch(null);
      setErr(null);
      onForgetExtras?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await warmTrezorConnect();
        if (cancelled) return;
        setWarm(true);
        setErr((prev) =>
          prev && /not initialized/i.test(prev) ? null : prev,
        );
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (/not initialized/i.test(raw)) {
          resetTrezorInit();
          try {
            await warmTrezorConnect();
            if (cancelled) return;
            setWarm(true);
            setErr(null);
            return;
          } catch (e2) {
            if (!cancelled) {
              setErr(
                humanTrezorError(
                  e2 instanceof Error ? e2.message : String(e2),
                ),
              );
            }
            return;
          }
        }
        if (!cancelled) setErr(humanTrezorError(raw));
      }
    })();
    void probeSuite().then((s) => {
      if (!cancelled) setSuite(s);
    });
    void detectSuiteChannel().then((c) => {
      if (!cancelled) setSuiteChannel(c);
    });
    void getDeviceHints().then((h) => {
      if (!cancelled) setDeviceHints(h);
    });
    return () => {
      cancelled = true;
    };
  }, [setErr]);

  const applySession = useCallback(
    (
      address: Address,
      derivationIndex: number,
      derivationPath: string,
      id: string,
    ) => {
      const next: Session = {
        address,
        derivationIndex,
        derivationPath,
        deviceId: id,
      };
      setSession(next);
      setWatch(next);
      saveWatch(next);
      setAccountIndex(derivationIndex);
      saveAccountIndex(derivationIndex);
      setDeviceId(id);
    },
    [],
  );

  const selectListedAccount = useCallback(
    (a: ListedAccount) => {
      applySession(
        a.address as Address,
        a.derivationIndex,
        a.derivationPath,
        deviceId,
      );
      setErr(null);
    },
    [applySession, deviceId, setErr],
  );

  function onCancelConnect() {
    connectGen.current += 1;
    cancelTrezorConnect("user-cancel");
    setConnecting(false);
    setListing(false);
    setBusy(false);
    // Taho: Perch only stops waiting — reject still happens on the device if prompted.
    setErr(
      suite === "ok"
        ? "Stopped waiting in Perch. Suite is still linked — if a prompt is open, confirm or reject on the device, then Start connection again."
        : "Stopped waiting in Perch. Open Suite, unlock the device, then Start connection.",
    );
  }

  function onCancelBusy() {
    connectGen.current += 1;
    cancelTrezorConnect("user-cancel");
    setConnecting(false);
    setListing(false);
    setBusy(false);
    setErr(
      suite === "ok"
        ? "Stopped waiting in Perch. Suite is still linked — finish or reject on the device if Suite still shows a prompt, then retry."
        : "Stopped waiting in Perch. Open Suite, then retry.",
    );
  }

  function finishAccountList(
    accounts: ListedAccount[],
    id: string,
    gen: number,
  ) {
    if (connectGen.current !== gen) return;
    setAccountList(accounts);
    saveAccountList(accounts);
    setDeviceId(id);
    const prefer =
      accounts.find((a) => a.derivationIndex === accountIndex) ?? accounts[0];
    if (prefer) {
      applySession(
        prefer.address as Address,
        prefer.derivationIndex,
        prefer.derivationPath,
        id,
      );
    }
    void probeSuite().then(setSuite);
  }

  function onLoadAccounts(opts?: {
    gapTrim?: boolean;
    from?: number;
    to?: number;
  }) {
    const gapTrim = !!opts?.gapTrim;
    const spec = parseLoadSpec(accountRange) ?? { from: 0, to: 11, span: 12 };
    let from: number;
    let to: number;
    if (typeof opts?.from === "number" || typeof opts?.to === "number") {
      // Path → Load wallet (from=to=slot) or explicit range.
      from =
        typeof opts.from === "number"
          ? Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Math.floor(opts.from)))
          : spec.from;
      to =
        typeof opts.to === "number"
          ? Math.max(from, Math.min(ACCOUNT_INDEX_MAX, Math.floor(opts.to)))
          : from;
    } else if (gapTrim) {
      // Discover used: scan from slot 0 (at least 24).
      from = 0;
      to = Math.max(23, spec.span - 1);
    } else {
      // Count field: `20` or `2000-3000`.
      from = spec.from;
      to = spec.to;
    }
    const span = Math.max(1, to - from + 1);
    setErr(null);
    setBusy(true);
    setListing(true);
    setConnecting(true);
    const gen = ++connectGen.current;
    const pull = gapTrim ? Math.max(span, 24) : span;
    setAccountIndex(from);
    saveAccountIndex(from);
    const pending = listTrezorAccountsFromGesture(pull, from);
    const timeout = window.setTimeout(() => {
      if (connectGen.current !== gen) return;
      cancelTrezorConnect("timeout");
      setConnecting(false);
      setListing(false);
      setBusy(false);
      setErr(
        suite === "ok"
          ? "Suite is running but did not finish Allow. Check Suite, Allow Pulse Perch, then Load accounts again."
          : "Timed out loading accounts. Open Trezor Suite, then retry.",
      );
      void probeSuite().then(setSuite);
    }, 90_000);
    void pending
      .then(async ({ accounts, deviceId: id }) => {
        if (connectGen.current !== gen) return;
        if (!gapTrim) {
          finishAccountList(accounts, id, gen);
          return;
        }
        const saved = loadRpcOverride();
        const rpcEff: RpcOverride | undefined = saved || rpc || undefined;
        const { trimmed, lastUsed } = await trimAccountsByPlsGap(
          accounts,
          chainId,
          rpcEff,
        );
        finishAccountList(trimmed, id, gen);
        if (lastUsed < 0) {
          setErr(
            "No PLS on listed accounts — kept slot 0. Fund it or raise range and Load again.",
          );
        }
      })
      .catch((e) => {
        if (connectGen.current !== gen) return;
        const raw = e instanceof Error ? e.message : String(e);
        if (/not\s*initialized/i.test(raw)) {
          resetTrezorInit();
          setWarm(false);
          void warmTrezorConnect()
            .then(() => setWarm(true))
            .catch(() => setWarm(false));
          setErr(
            "Connect got reset — wait a second, then Load accounts again.",
          );
        } else {
          setErr(humanTrezorError(raw));
        }
        void probeSuite().then(setSuite);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (connectGen.current !== gen) return;
        setConnecting(false);
        setListing(false);
        setBusy(false);
      });
  }

  function onConnect() {
    setErr(null);
    setBusy(true);
    setConnecting(true);
    const gen = ++connectGen.current;
    saveAccountIndex(accountIndex);
    const pending = connectTrezorFromGesture(accountIndex);
    const timeout = window.setTimeout(() => {
      if (connectGen.current !== gen) return;
      cancelTrezorConnect("timeout");
      setConnecting(false);
      setBusy(false);
      setErr(
        suite === "ok"
          ? "Suite is running but did not finish Allow. Check Suite (other screen / behind windows), unlock Trezor, Allow Pulse Perch, confirm address — then Connect again."
          : "Connect timed out. Open Trezor Suite, unlock the device, then Connect again.",
      );
      void probeSuite().then(setSuite);
    }, 45_000);
    void pending
      .then((r) => {
        if (connectGen.current !== gen) return;
        applySession(
          r.address0 as Address,
          r.derivationIndex,
          r.derivationPath,
          r.deviceId,
        );
        void probeSuite().then(setSuite);
      })
      .catch((e) => {
        if (connectGen.current !== gen) return;
        const raw = e instanceof Error ? e.message : String(e);
        if (/not\s*initialized/i.test(raw)) {
          resetTrezorInit();
          setWarm(false);
          void warmTrezorConnect()
            .then(() => setWarm(true))
            .catch(() => setWarm(false));
          setErr(
            "Connect got reset — wait a second for Suite link, then click Connect again.",
          );
        } else {
          setErr(humanTrezorError(raw));
        }
        void probeSuite().then(setSuite);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (connectGen.current !== gen) return;
        setConnecting(false);
        setBusy(false);
      });
  }

  /** Official connect-examples: take session after CONNECT_UNACQUIRED. */
  async function onAcquireDevice() {
    setBusy(true);
    setErr(null);
    try {
      const ok = await acquireTrezorDevice();
      const h = await getDeviceHints();
      setDeviceHints(h);
      if (!ok) {
        setErr(
          "Could not acquire Trezor — close Suite tabs using it, unlock the device, try again.",
        );
      }
    } catch (e) {
      setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  function onDisconnect() {
    setSession(null);
    setErr(null);
    onDisconnectExtras?.();
  }

  /** Clear loaded accounts + face address (session/watch). */
  function onClearAccounts() {
    setAccountList([]);
    saveAccountList([]);
    setSession(null);
    setWatch(null);
    saveWatch(null);
    setErr(null);
    onForgetExtras?.();
  }

  function onForget() {
    setSession(null);
    setWatch(null);
    saveWatch(null);
    setAccountList([]);
    saveAccountList([]);
    setErr(null);
    onForgetExtras?.();
  }

  return {
    warm,
    setWarm,
    suite,
    setSuite,
    connecting,
    listing,
    session,
    setSession,
    watch,
    setWatch,
    accountIndex,
    setAccountIndex,
    accountList,
    setAccountList,
    accountCount,
    accountRange,
    setAccountRange,
    deviceId,
    setDeviceId,
    suiteChannel,
    setSuiteChannel,
    deviceHints,
    setDeviceHints,
    active,
    canSign,
    applySession,
    selectListedAccount,
    onCancelConnect,
    onCancelBusy,
    onLoadAccounts,
    onConnect,
    onAcquireDevice,
    onDisconnect,
    onClearAccounts,
    onForget,
    pathTemplate,
    applyPathTemplate,
    connectGen,
  };
}
