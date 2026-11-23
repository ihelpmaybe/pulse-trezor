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
  loadAccountCount,
  loadAccountIndex,
  loadAccountList,
  loadWatch,
  saveAccountCount,
  saveAccountIndex,
  saveAccountList,
  saveWatch,
  type Session,
} from "../ui/deskStorage";

type SetErr = Dispatch<SetStateAction<string | null>>;
type SetBusy = Dispatch<SetStateAction<boolean>>;

export function useDeskConnect(opts: {
  setErr: SetErr;
  setBusy: SetBusy;
  /** Extra cleanup when forgetting watch (bag / send faces). */
  onForgetExtras?: () => void;
  /** Extra cleanup on disconnect (clear draft send). */
  onDisconnectExtras?: () => void;
}) {
  const { setErr, setBusy, onForgetExtras, onDisconnectExtras } = opts;

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
  const [accountCount, setAccountCount] = useState(() => loadAccountCount());
  const [deviceId, setDeviceId] = useState("trezor-default");
  const [listing, setListing] = useState(false);
  const [suiteChannel, setSuiteChannel] = useState<SuiteChannel>("unknown");
  const [deviceHints, setDeviceHints] = useState<DeviceHints | null>(null);

  const active = session ?? watch;
  const canSign = !!session;

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
    setErr(
      suite === "ok"
        ? "Cancelled. Suite is still linked — click Connect or Sign again when ready."
        : "Cancelled. Open Suite, then try Connect again.",
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
        ? "Cancelled. Suite is still linked — check Suite on other screens, then retry."
        : "Cancelled. Open Suite, then retry.",
    );
  }

  function onLoadAccounts() {
    setErr(null);
    setBusy(true);
    setListing(true);
    setConnecting(true);
    const gen = ++connectGen.current;
    saveAccountCount(accountCount);
    const pending = listTrezorAccountsFromGesture(accountCount);
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
      .then(({ accounts, deviceId: id }) => {
        if (connectGen.current !== gen) return;
        setAccountList(accounts);
        saveAccountList(accounts);
        setDeviceId(id);
        const prefer =
          accounts.find((a) => a.derivationIndex === accountIndex) ??
          accounts[0];
        if (prefer) {
          applySession(
            prefer.address as Address,
            prefer.derivationIndex,
            prefer.derivationPath,
            id,
          );
        }
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

  function onDisconnect() {
    setSession(null);
    setErr(null);
    onDisconnectExtras?.();
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
    setAccountCount,
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
    onDisconnect,
    onForget,
    connectGen,
  };
}
