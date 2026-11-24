/** Switch desk network select to 943 and click Start connection. Env: CDP_PORT */
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
  awaitPromise: true,
  expression: `(() => {
    const sel = [...document.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.value === "943"),
    );
    if (!sel) return { ok: false, why: "no-943-select" };
    sel.value = "943";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /Start connection/i.test(b.textContent || ""),
    );
    if (btn) btn.click();
    return {
      ok: true,
      chain: sel.value,
      clickedConnect: !!btn,
    };
  })()`,
});
console.log(JSON.stringify(r.result?.result?.value || r, null, 2));
ws.close();
