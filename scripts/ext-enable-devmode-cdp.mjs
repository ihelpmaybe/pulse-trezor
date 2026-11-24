/**
 * CDP: turn on Developer mode on chrome://extensions (lab profile).
 * Does not click Load unpacked (OS file dialog) — seed / manual still needed for that.
 * Env: CDP_PORT=9233
 */
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
    p.type === "page" && String(p.url || "").startsWith("chrome://extensions"),
);
if (!page?.webSocketDebuggerUrl) {
  console.error("NO_EXT_PAGE");
  process.exit(1);
}
const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
await send("Runtime.enable");

const expr = `(() => {
  const mgr = document.querySelector("extensions-manager");
  if (!mgr?.shadowRoot) return { ok: false, why: "no-manager" };
  const toolbar = mgr.shadowRoot.querySelector("extensions-toolbar");
  const tb = toolbar?.shadowRoot;
  const toggle = tb?.querySelector("#devMode");
  if (toggle && !toggle.checked) {
    toggle.click();
  }
  const load = tb?.querySelector("#loadUnpacked");
  return {
    ok: true,
    developerMode: !!toggle?.checked,
    hasLoadUnpacked: !!load,
    bodyHasPerch: document.body.innerText.includes("Pulse Perch"),
  };
})()`;

const r = await send("Runtime.evaluate", {
  expression: expr,
  returnByValue: true,
  awaitPromise: true,
});
console.log(JSON.stringify(r.result?.result?.value || r, null, 2));
ws.close();
browser.ws.close();
