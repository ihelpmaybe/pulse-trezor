(() => {
  if (globalThis.__PULSE_PERCH_BRIDGE_LISTENING__) return;
  globalThis.__PULSE_PERCH_BRIDGE_LISTENING__ = true;

  /**
   * Content scripts run in an isolated world — they cannot read
   * window.__pulsePerchInject from the desk page. Relay via postMessage.
   */
  const pending = new Map();

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "pulse-perch-page-bridge") return;
    if (data.type !== "response" && data.type !== "pong") return;
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    waiter(data);
  });

  function askPage(payload, timeoutMs = 120000) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({
          error: {
            code: 4100,
            message: "Pulse Perch page bridge timeout — reload desk",
          },
        });
      }, timeoutMs);
      pending.set(id, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
      window.postMessage(
        { ...payload, id, source: "pulse-perch-ext-bridge" },
        "*",
      );
    });
  }

  /** Desk → dapp fan-out: accountsChanged / chainChanged (no fake accounts from storage) */
  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (
      !data ||
      data.source !== "pulse-perch-page-bridge" ||
      data.type !== "provider-event"
    ) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        kind: "eip1193-broadcast",
        event: data.event,
        args: data.args || [],
      });
      if (data.event === "accountsChanged") {
        const acc = Array.isArray(data.args?.[0]) ? data.args[0][0] : null;
        chrome.runtime.sendMessage({
          kind: "perch-session",
          address: acc || null,
          chainId: undefined,
        });
      }
      if (data.event === "chainChanged") {
        const hex = String(data.args?.[0] || "");
        const chainId = hex.startsWith("0x")
          ? parseInt(hex, 16)
          : Number(hex) || 369;
        chrome.runtime.sendMessage({
          kind: "perch-session",
          address: undefined,
          chainId,
        });
      }
    } catch {
      /* SW asleep / no listener — dapp keeps last-known until next request */
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.kind === "eip1193-ping") {
      sendResponse({ ok: true });
      return false;
    }
    if (!msg || msg.kind !== "eip1193-forward") return false;
    askPage({
      type: "request",
      method: msg.method,
      params: msg.params,
    }).then((data) => {
      if (data?.error) sendResponse({ error: data.error });
      else sendResponse({ result: data?.result });
    });
    return true;
  });
})();
