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
  "(() => {",
  "  const sites = document.getElementById('perch-tab-sites');",
  "  if (sites) sites.click();",
  "  const text = document.body.innerText.slice(0, 3000);",
  "  const btns = [...document.querySelectorAll('button')]",
  "    .map((b) => ({ t: (b.textContent || '').trim(), d: b.disabled }))",
  "    .filter((x) => /Pair|Approve|Reject|Drop|Save|Connect|Sites/i.test(x.t));",
  "  const pid = localStorage.getItem('pulse-desk-reown-project-id');",
  "  const reown = [...document.querySelectorAll('label')].find((l) =>",
  "    /Reown id/i.test(l.textContent || ''),",
  "  );",
  "  const reownVal = reown?.querySelector('input')?.value || null;",
  "  return {",
  "    pid,",
  "    reownVal,",
  "    btns,",
  "    hasProposal: /Approve session/i.test(text),",
  "    sessions: [...document.querySelectorAll('[data-wc-session]')].map((li) =>",
  "      li.getAttribute('data-wc-session'),",
  "    ),",
  "    snippet: text",
  "      .split('\\n')",
  "      .map((l) => l.trim())",
  "      .filter((l) =>",
  "        /pair|session|error|project|reown|Approve|reject|fail|warn|uri/i.test(l),",
  "      )",
  "      .slice(0, 40),",
  "  };",
  "})()",
].join("\n");

const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  returnByValue: true,
  expression,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
