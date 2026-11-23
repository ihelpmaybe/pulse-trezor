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
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    // Click activity refresh if present
    const actBtns = [...document.querySelectorAll("button")].filter((b) =>
      /↻|Refresh|All/i.test(b.textContent || ""),
    );
    const refresh = actBtns.find((b) => /↻/.test(b.textContent || ""));
    refresh?.click();
    await new Promise((r) => setTimeout(r, 800));
    const rows = [...document.querySelectorAll("a, li, [class*=activ], [class*=tx]")]
      .map((el) => ({
        text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120),
        href: el.href || el.getAttribute("href") || null,
      }))
      .filter(
        (r) =>
          /approve/i.test(r.text) ||
          (r.href && /tx\\/0x/i.test(r.href)),
      )
      .slice(0, 15);
    const hrefs = [...document.querySelectorAll("a[href*='tx/']")]
      .map((a) => a.href)
      .slice(0, 10);
    const hashes = [
      ...new Set(
        hrefs
          .map((h) => (h.match(/0x[a-fA-F0-9]{64}/) || [])[0])
          .filter(Boolean),
      ),
    ];
    return { rows, hrefs, hashes };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
