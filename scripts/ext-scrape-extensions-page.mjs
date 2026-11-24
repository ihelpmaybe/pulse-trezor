/** CDP: scrape chrome://extensions body for Pulse Perch. Env: CDP_PORT */
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

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  (r) => r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);
await browser.send("Target.createTarget", { url: "chrome://extensions/" });
await new Promise((r) => setTimeout(r, 1800));
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    p.type === "page" &&
    String(p.url || "").startsWith("chrome://extensions") &&
    p.webSocketDebuggerUrl,
);
if (!page) {
  console.error("NO_EXT_PAGE");
  process.exit(1);
}
const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const t = document.body.innerText || "";
    return {
      hasPerch: /Pulse Perch/i.test(t),
      hasErrors: /Errors|Manifest file is missing|Could not load/i.test(t),
      snippet: t.replace(/\\s+/g, " ").slice(0, 1000),
    };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value || out, null, 2));
ws.close();
browser.ws.close();
