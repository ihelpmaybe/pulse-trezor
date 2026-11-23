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
const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
await send("Console.enable");

const logs = [];
// note: console messages via event - skip, just click

for (let i = 0; i < 10; i++) {
  const out = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const sites = document.getElementById('perch-tab-sites');
      if (sites) sites.click();
      await new Promise((r) => setTimeout(r, 200));
      const warn = [...document.querySelectorAll('label')].find((l) =>
        /origin warn/i.test(l.textContent || ''),
      );
      const cb = warn?.querySelector('input[type="checkbox"]');
      if (cb && !cb.checked) cb.click();
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /Approve session/i.test(b.textContent || ''),
      );
      if (!btn) return { i: ${i}, found: false };
      const disabled = btn.disabled;
      if (!disabled) btn.click();
      await new Promise((r) => setTimeout(r, 1500));
      const alerts = [...document.querySelectorAll('[role=alert], .error, .warn-line')]
        .map((e) => (e.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 8);
      const waiting = (document.body.innerText.match(/(\\d+) more session request/i) || [])[1] || null;
      const sessions = [...document.querySelectorAll('[data-wc-session]')].map((li) =>
        li.getAttribute('data-wc-session'),
      );
      return { i: ${i}, found: true, disabled, waiting, sessions, alerts };
    })()`,
  });
  const v = out.result?.result?.value;
  console.log(JSON.stringify(v));
  logs.push(v);
  if (!v?.found) break;
}

ws.close();
