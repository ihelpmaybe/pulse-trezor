import WebSocket from "ws";
const PORT = Number(process.env.CDP_PORT || 9233);
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const perch = list.find(
  (p) => /5174/.test(p.url || "") && p.webSocketDebuggerUrl,
);
if (!perch) {
  console.log("NO_PERCH");
  process.exit(1);
}
const ws = new WebSocket(perch.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.on("open", res);
  ws.on("error", rej);
});
let id = 0;
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    const h = (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.id === i) {
        ws.off("message", h);
        r(m);
      }
    };
    ws.on("message", h);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const text = document.body.innerText || "";
    const tx = (text.match(/0x[a-fA-F0-9]{64}/) || [])[0] || null;
    const alerts = [...document.querySelectorAll("[role=alert], .err, .error")]
      .map((e) => (e.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 8);
    const confirm = /Confirm on Trezor/i.test(text);
    const signing = /Signing|Look at your|Suite/i.test(text);
    const pending = /pending|broadcast|submitted/i.test(text);
    return {
      tx,
      alerts,
      confirm,
      signing,
      pending,
      snip: text.slice(0, 1500),
    };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
