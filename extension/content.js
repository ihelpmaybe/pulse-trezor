(() => {
  const host = location.hostname;
  const port = location.port;
  if (
    (host === "127.0.0.1" || host === "localhost") &&
    (port === "5173" || port === "5174")
  ) {
    return; /* Perch desk uses perch-bridge.js only */
  }

  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("inpage.js");
  s.async = false;
  (document.documentElement || document.head).appendChild(s);
  s.remove();

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "pulse-perch-page" || data.type !== "request")
      return;
    chrome.runtime.sendMessage(
      {
        kind: "eip1193",
        id: data.id,
        method: data.method,
        params: data.params,
      },
      (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              source: "pulse-perch-ext",
              type: "response",
              id: data.id,
              error: {
                code: 4100,
                message: chrome.runtime.lastError.message,
              },
            },
            "*",
          );
          return;
        }
        window.postMessage(
          {
            source: "pulse-perch-ext",
            type: "response",
            id: data.id,
            result: resp?.result,
            error: resp?.error,
          },
          "*",
        );
      },
    );
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.kind !== "eip1193-event") return;
    window.postMessage(
      {
        source: "pulse-perch-ext",
        type: "event",
        event: msg.event,
        args: msg.args || [],
      },
      "*",
    );
  });
})();
