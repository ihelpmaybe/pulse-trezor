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
const perch = list.find(
  (p) => p.type === "page" && /5174/.test(p.url || "") && p.webSocketDebuggerUrl,
);
if (!perch) {
  console.log("NO_PERCH");
  process.exit(1);
}

const expression = [
  "(async () => {",
  "  const inj = window.__pulsePerchInject;",
  "  let pong = null;",
  "  const onMsg = (ev) => {",
  "    if (ev.data && ev.data.source === 'pulse-perch-page-bridge') pong = ev.data;",
  "  };",
  "  window.addEventListener('message', onMsg);",
  "  window.postMessage({ source: 'pulse-perch-ext-bridge', type: 'ping', id: 'probe1' }, '*');",
  "  await new Promise((r) => setTimeout(r, 500));",
  "  window.removeEventListener('message', onMsg);",
  "  let accounts = null;",
  "  let err = null;",
  "  try {",
  "    accounts = inj ? await inj.request({ method: 'eth_accounts' }) : null;",
  "  } catch (e) {",
  "    err = String(e.message || e);",
  "  }",
  "  return { hasInject: !!inj, pong: pong, accounts: accounts, err: err };",
  "})()",
].join("\n");

const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression,
});
console.log(JSON.stringify(out.result?.result?.value ?? out, null, 2));
ws.close();
