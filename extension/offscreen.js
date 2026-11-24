/* MV3 offscreen — hosts desk iframe + relay (Rabby/Ambire pattern, HW stay on desk Connect). */
(() => {
  const desk = document.getElementById("desk");
  const pending = new Map();

  window.addEventListener("message", (ev) => {
    if (ev.source !== desk?.contentWindow) return;
    const data = ev.data;
    if (!data || data.source !== "pulse-perch-page-bridge") return;
    if (data.type !== "response" && data.type !== "pong") return;
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    waiter(data);
  });

  function askDesk(payload, timeoutMs = 120000) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({
          error: {
            code: 4100,
            message: "Offscreen desk bridge timeout — open Perch once",
          },
        });
      }, timeoutMs);
      pending.set(id, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
      try {
        desk.contentWindow.postMessage(
          { ...payload, id, source: "pulse-perch-ext-bridge" },
          "*",
        );
      } catch (e) {
        clearTimeout(timer);
        pending.delete(id);
        resolve({
          error: {
            code: 4100,
            message: e?.message || "Offscreen iframe not ready",
          },
        });
      }
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.kind === "offscreen-ping") {
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.kind === "eip1193-forward-offscreen") {
      askDesk({
        type: "request",
        method: msg.method,
        params: msg.params,
      }).then((data) => {
        if (data?.error) sendResponse({ error: data.error });
        else sendResponse({ result: data?.result });
      });
      return true;
    }
    return false;
  });
})();
