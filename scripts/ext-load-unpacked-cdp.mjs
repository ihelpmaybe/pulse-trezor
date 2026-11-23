/**
 * CDP: open chrome://extensions → enable Developer mode → click Load unpacked.
 * Then use OS file dialog (computer use / manual) to pick extension/.
 * Env: CDP_PORT (default 9233)
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
await new Promise((r) => setTimeout(r, 1800));

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    String(p.url || "").startsWith("chrome://extensions") &&
    p.webSocketDebuggerUrl,
);
if (!page) {
  console.error("NO_EXT_PAGE", list.map((p) => p.url));
  process.exit(1);
}

const s = await wsRpc(page.webSocketDebuggerUrl);
await s.send("Runtime.enable");
const expr = `(() => {
  const mgr = document.querySelector("extensions-manager");
  if (!mgr?.shadowRoot) return { ok: false, why: "no manager" };
  const toolbar = mgr.shadowRoot.querySelector("extensions-toolbar");
  const tsr = toolbar?.shadowRoot;
  if (!tsr) return { ok: false, why: "no toolbar" };
  const dev = tsr.querySelector("#devMode");
  const was = !!(dev && (dev.checked || dev.getAttribute("aria-pressed") === "true"));
  if (dev && !was) dev.click();
  const load = tsr.querySelector("#loadUnpacked");
  if (!load) {
    return {
      ok: false,
      why: "no loadUnpacked",
      buttons: [...tsr.querySelectorAll("cr-button, button")].map((b) => b.textContent.trim()).slice(0, 12),
    };
  }
  load.click();
  return { ok: true, devWas: was, clickedLoad: true };
})()`;

const out = await s.send("Runtime.evaluate", {
  expression: expr,
  returnByValue: true,
});
console.log(JSON.stringify(out.result?.result?.value || out, null, 2));
browser.ws.close();
s.ws.close();
