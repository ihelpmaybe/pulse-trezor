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
const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) =>
  r.json(),
);
const b = await wsRpc(version.webSocketDebuggerUrl);
await b.send("Target.createTarget", { url: "chrome://extensions/" });
await new Promise((r) => setTimeout(r, 1500));
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    String(p.url || "").startsWith("chrome://extensions") &&
    p.webSocketDebuggerUrl,
);
const s = await wsRpc(page.webSocketDebuggerUrl);
await s.send("Runtime.enable");
const out = await s.send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const mgr = document.querySelector("extensions-manager");
    const items = mgr?.shadowRoot
      ?.querySelector("extensions-item-list")
      ?.shadowRoot?.querySelectorAll("extensions-item");
    const out = [];
    for (const item of items || []) {
      const sr = item.shadowRoot;
      const name = sr?.querySelector("#name")?.textContent?.trim();
      if (name !== "Pulse Perch") continue;
      const ids = [...sr.querySelectorAll("*")]
        .map((el) => ({
          tag: el.tagName,
          id: el.id,
          aria: el.getAttribute("aria-label"),
          title: el.getAttribute("title"),
          text: (el.textContent || "").trim().slice(0, 40),
        }))
        .filter(
          (x) =>
            x.id ||
            /reload|remove|details|errors/i.test(
              (x.aria || "") + (x.title || "") + x.text,
            ),
        );
      out.push({ name, idAttr: item.id, ids: ids.slice(0, 50) });
    }
    return out;
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
b.ws.close();
s.ws.close();
