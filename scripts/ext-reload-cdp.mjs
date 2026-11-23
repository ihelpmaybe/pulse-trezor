/** Reload Pulse Perch unpacked extension via chrome://extensions CDP. */
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
await new Promise((r) => setTimeout(r, 1500));
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    String(p.url || "").startsWith("chrome://extensions") &&
    p.webSocketDebuggerUrl,
);
if (!page) {
  console.error("NO_EXT_PAGE");
  process.exit(1);
}
const s = await wsRpc(page.webSocketDebuggerUrl);
await s.send("Runtime.enable");
const out = await s.send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const mgr = document.querySelector("extensions-manager");
    const items = mgr?.shadowRoot?.querySelector("extensions-item-list")
      ?.shadowRoot?.querySelectorAll("extensions-item");
    if (!items?.length) return { ok: false, why: "no items" };
    for (const item of items) {
      const name = item.shadowRoot?.querySelector("#name")?.textContent?.trim();
      if (name !== "Pulse Perch") continue;
      const reload =
        item.shadowRoot?.querySelector("#dev-reload-button") ||
        item.shadowRoot?.querySelector("#dev-reload");
      if (!reload) return { ok: false, why: "no reload", name };
      reload.click();
      return { ok: true, name, id: item.getAttribute("id") };
    }
    return { ok: false, why: "Pulse Perch not found" };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value || out, null, 2));
browser.ws.close();
s.ws.close();
