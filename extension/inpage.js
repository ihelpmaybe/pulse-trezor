(() => {
  if (window.ethereum?.isPulsePerch) return;

  const listeners = new Map();
  let reqId = 0;
  const pending = new Map();

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "pulse-perch-ext" || data.type !== "response")
      return;
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    if (data.error) {
      const err = new Error(data.error.message || "Provider error");
      err.code = data.error.code ?? 4200;
      waiter.reject(err);
    } else {
      waiter.resolve(data.result);
    }
  });

  function emit(event, ...args) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(...args);
      } catch {
        /* ignore */
      }
    }
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "pulse-perch-ext" || data.type !== "event")
      return;
    emit(data.event, ...(data.args || []));
  });

  const provider = {
    isPulsePerch: true,
    isMetaMask: true,
    request({ method, params }) {
      const id = ++reqId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.postMessage(
          {
            source: "pulse-perch-page",
            type: "request",
            id,
            method,
            params,
          },
          "*",
        );
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            const err = new Error(
              "Pulse Perch timed out — open Perch desk and connect Trezor",
            );
            err.code = 4100;
            reject(err);
          }
        }, 120_000);
      });
    },
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(listener);
      return this;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return this;
    },
  };

  window.ethereum = provider;
  try {
    window.dispatchEvent(new Event("ethereum#initialized"));
  } catch {
    /* ignore */
  }
})();
