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
        send: (m, p = {}) =>
          new Promise((res) => {
            const i = ++id;
            pending.set(i, res);
            ws.send(JSON.stringify({ id: i, method: m, params: p }));
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
const perch = list.find((p) => /5174/.test(p.url || "") && p.webSocketDebuggerUrl);
if (!perch) {
  console.error("NO_PERCH");
  process.exit(1);
}
const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    document.getElementById("perch-tab-approve")?.click();
    await new Promise((r) => setTimeout(r, 500));
    const panel = document.getElementById("perch-panel-approve");
    const connected = [...document.querySelectorAll("button")].some((b) =>
      /Disconnect/i.test(b.textContent || ""),
    );
    const chainBtns = [...document.querySelectorAll("button, [role=tab], select option")]
      .map((el) => (el.textContent || "").trim())
      .filter((t) => /test|main|943|369|Pulse/i.test(t))
      .slice(0, 30);
    const body = (document.body.innerText || "").slice(0, 2500);
    const tokenLine = (panel?.innerText || "").match(/Token:[\\s\\S]{0,80}/)?.[0];
    const spenderInput = panel?.querySelector('input[placeholder*="0x"]');
    const amtInput = [...(panel?.querySelectorAll("label") || [])]
      .find((l) => /Amount/i.test(l.textContent || ""))
      ?.querySelector("input");
    const approveBtn = [...(panel?.querySelectorAll("button") || [])].find((b) =>
      /Approve amount/i.test(b.textContent || ""),
    );
    const chips = [...(panel?.querySelectorAll(".book-chips button, .gas-pill") || [])].map(
      (b) => ({
        text: (b.textContent || "").trim(),
        on: b.classList.contains("on"),
      }),
    );
    const assetSelects = [...document.querySelectorAll("select")].map((s) => ({
      value: s.value,
      opts: [...s.options].slice(0, 12).map((o) => o.textContent?.trim()),
    }));
    const alerts = [...document.querySelectorAll("[role=alert], .warn-line, .err, .error")]
      .map((e) => (e.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 10);
    return {
      connected,
      tokenLine,
      spender: spenderInput?.value || null,
      amt: amtInput?.value || null,
      approveDisabled: approveBtn?.disabled ?? null,
      chips,
      assetSelects,
      alerts,
      chainHint: (body.match(/PulseChain[^\\n]{0,40}|chain[^\\n]{0,40}|943|369/i) || [])[0],
      grantSection: (panel?.innerText || "").includes("Grant"),
      panelHead: (panel?.innerText || "").slice(0, 600),
    };
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
