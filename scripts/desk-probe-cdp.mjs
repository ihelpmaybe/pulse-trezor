/** Probe Perch desk face via CDP. Env: CDP_PORT */
import WebSocket from "ws";

const PORT = Number(process.env.CDP_PORT || 9233);

function wsRpc(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.on("open", () => {
      resolve({
        ws,
        send: (method, params = {}) =>
          new Promise((res) => {
            const i = ++id;
            pending.set(i, res);
            ws.send(JSON.stringify({ id: i, method, params }));
          }),
      });
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    ws.on("error", reject);
  });
}

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    p.type === "page" &&
    /127\.0\.0\.1:517[34]/.test(p.url || "") &&
    p.webSocketDebuggerUrl,
);
if (!page) {
  console.error("NO_DESK");
  process.exit(1);
}
const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
await send("Runtime.enable");
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const text = document.body.innerText;
    const selects = [...document.querySelectorAll("select")].map((s) => ({
      label: s.getAttribute("aria-label") || s.name || "",
      value: s.value,
      options: [...s.options]
        .slice(0, 12)
        .map((o) => o.textContent.trim() + "=" + o.value),
    }));
    const btns = [...document.querySelectorAll("button")]
      .map((b) => b.textContent.trim())
      .filter(Boolean)
      .slice(0, 50);
    return {
      suite: /Suite/i.test(text),
      has943: /943|V4|testnet/i.test(text),
      hasSpeedUp: /Speed up/i.test(text),
      connectedHint: /Disconnect|Start connection|linked/i.test(text),
      selects,
      btns,
    };
  })()`,
});
console.log(JSON.stringify(r.result?.result?.value || r, null, 2));
ws.close();
