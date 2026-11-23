(() => {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.kind !== "eip1193-forward") return false;
    const run = async () => {
      const bridge = window.__pulsePerchInject;
      if (!bridge?.request) {
        return {
          error: {
            code: 4100,
            message: "Pulse Perch tab open but inject bridge not ready — connect Trezor",
          },
        };
      }
      try {
        const result = await bridge.request({
          method: msg.method,
          params: msg.params,
        });
        return { result };
      } catch (e) {
        return {
          error: {
            code: e?.code ?? 4200,
            message: e?.message || String(e),
          },
        };
      }
    };
    run().then(sendResponse);
    return true;
  });
})();
