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
const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json());
const browser = await wsRpc(version.webSocketDebuggerUrl);
await browser.send("Target.createTarget", { url: "chrome://extensions/" });
await new Promise((r) => setTimeout(r, 2000));
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const page = list.find((p) => String(p.url || "").startsWith("chrome://extensions") && p.webSocketDebuggerUrl);
const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    await new Promise((r) => setTimeout(r, 500));
    const mgr = document.querySelector("extensions-manager");
    const sr = mgr?.shadowRoot;
    const itemList = sr?.querySelector("extensions-item-list");
    const items = itemList?.shadowRoot?.querySelectorAll("extensions-item");
    const names = [];
    if (items) {
      for (const item of items) {
        const name = item.shadowRoot?.querySelector("#name")?.textContent?.trim();
        const id = item.getAttribute("id");
        names.push({ name, id });
      }
    }
    const toolbar = sr?.querySelector("extensions-toolbar")?.shadowRoot;
    const dev = toolbar?.querySelector("#devMode");
    return {
      count: names.length,
      names,
      devMode: !!(dev && (dev.checked || dev.getAttribute("aria-pressed") === "true")),
      html: (sr?.innerHTML || "").slice(0, 200),
    };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value ?? out, null, 2));
const sw = list.filter((p) => String(p.url || "").includes("chrome-extension://"));
console.log("SW", sw.map((p) => p.url).slice(0, 10));
ws.close();
browser.ws.close();
