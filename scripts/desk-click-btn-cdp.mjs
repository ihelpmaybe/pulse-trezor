/** Click first button matching /pattern/i. Env: CDP_PORT · BTN_RE */
import WebSocket from "ws";

const PORT = Number(process.env.CDP_PORT || 9233);
const RE = new RegExp(process.env.BTN_RE || "Send", "i");

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
    const re = ${RE.toString()};
    const btn = [...document.querySelectorAll("button")].find((b) =>
      re.test((b.textContent || "").trim()),
    );
    if (!btn) {
      return {
        ok: false,
        labels: [...document.querySelectorAll("button")]
          .map((b) => b.textContent.trim())
          .filter(Boolean)
          .slice(0, 40),
      };
    }
    btn.click();
    return { ok: true, text: btn.textContent.trim().slice(0, 60) };
  })()`,
});
console.log(JSON.stringify(r.result?.result?.value || r, null, 2));
ws.close();
