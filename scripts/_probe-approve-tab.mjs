import WebSocket from "ws";
const PORT = 9233;
function wsRpc(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.on("open", () => {
      resolve({
        ws,
        send: (m, p = {}) =>
          new Promise((res) => {
            const i = ++id;
            pending.set(i, res);
            ws.send(JSON.stringify({ id: i, method: m, params: p }));
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
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const perch = list.find((p) => /5174/.test(p.url || ""));
const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const tab = document.getElementById("perch-tab-approve");
    tab?.click();
    await new Promise((r) => setTimeout(r, 500));
    const panel = document.querySelector('[aria-labelledby="perch-tab-approve"]');
    return {
      tab: !!tab,
      panel: !!panel,
      panelText: (panel?.innerText || "").slice(0, 800),
      buttons: [...document.querySelectorAll("button")].map((b) => (b.textContent || "").trim()).filter((t) => /approve|revoke|scan/i.test(t)).slice(0, 20),
    };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
