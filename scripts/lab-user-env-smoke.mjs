/**
 * Smoke: trezor-user-env controller reachable (don’t-pretend lab).
 * Exit 0 if background-check responds; 1 if missing.
 * Does not claim Perch HW path works — only that the official lab is up.
 */
import WebSocket from "ws";

const URL = process.env.TENV_WS || "ws://127.0.0.1:9001/";
const TIMEOUT = Number(process.env.TENV_TIMEOUT_MS || 4000);

function once(ws, event, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${event} timeout`)), ms);
    ws.once(event, (arg) => {
      clearTimeout(t);
      resolve(arg);
    });
  });
}

async function main() {
  const ws = new WebSocket(URL);
  try {
    await once(ws, "open", TIMEOUT);
    const welcome = await once(ws, "message", TIMEOUT);
    const intro = JSON.parse(String(welcome));
    if (intro.type !== "client" && !intro.firmwares) {
      throw new Error("unexpected welcome");
    }
    ws.send(JSON.stringify({ type: "background-check", id: 1 }));
    const raw = await once(ws, "message", TIMEOUT);
    const msg = JSON.parse(String(raw));
    const running = (v) =>
      typeof v === "boolean"
        ? v
        : !!(v && typeof v === "object" && v.is_running);
    const out = {
      ok: true,
      bridge: running(msg.bridge_status),
      emulator: running(msg.emulator_status),
      wire: "Perch → Connect → Suite → Bridge/emu",
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        hint: "scripts/lab-user-env.ps1 -Action up",
      }),
    );
    process.exit(1);
  } finally {
    try {
      ws.close();
    } catch {
      /* */
    }
  }
}

main();
