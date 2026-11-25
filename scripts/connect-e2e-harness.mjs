/**
 * Connect e2e harness runner.
 *
 *   node scripts/connect-e2e-harness.mjs          # fake face/error (default)
 *   node scripts/connect-e2e-harness.mjs fake
 *   node scripts/connect-e2e-harness.mjs lab      # probe trezor-user-env :9001
 *   node scripts/connect-e2e-harness.mjs checklist
 *
 * Fake ≠ hardware. Lab ≠ Perch Connected. Device proof = Suite Allow on real wire.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import WebSocket from "ws";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = (process.argv[2] || "fake").toLowerCase();

const DEVICE_CHECKLIST = [
  "Start lab: scripts/lab-user-env.ps1 -Action up (Docker Desktop) — or use a real Trezor",
  "Dashboard: http://127.0.0.1:9002 — start emulator (T3T1 / T2T1) if lab",
  "Suite: unlock device/emu; Debug → prefer user-env Bridge if lab",
  "Perch: Connect → Allow in Suite → address matches device screen",
  "Optional YES taps: scripts/emu-yes.ps1 (slow — do not spam)",
  "Evidence → tests/connect/ (date · Suite Desktop · emu/device model)",
  "Kill_if: software HD / mnemonic unlock labeled as Trezor",
];

function printChecklist() {
  console.log("CONNECT_DEVICE_CHECKLIST");
  console.log("wire: Perch → Connect → Suite → Bridge → device|official-emu");
  for (const line of DEVICE_CHECKLIST) console.log(`- [ ] ${line}`);
}

async function probeLab() {
  const URL = process.env.TENV_WS || "ws://127.0.0.1:9001/";
  const TIMEOUT = Number(process.env.TENV_TIMEOUT_MS || 4000);
  const once = (ws, event, ms) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`${event} timeout`)), ms);
      ws.once(event, (arg) => {
        clearTimeout(t);
        resolve(arg);
      });
    });
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
    console.log(
      JSON.stringify(
        {
          mode: "lab",
          banner: "LAB probe — not a Perch Connected proof",
          ok: true,
          bridge: running(msg.bridge_status),
          emulator: running(msg.emulator_status),
          wire: "Perch → Connect → Suite → Bridge/emu",
          next: "Open Suite → Perch Connect → Allow",
        },
        null,
        2,
      ),
    );
    printChecklist();
    process.exit(0);
  } catch (e) {
    console.error(
      JSON.stringify({
        mode: "lab",
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        hint: "scripts/lab-user-env.ps1 -Action up",
      }),
    );
    printChecklist();
    process.exit(1);
  } finally {
    try {
      ws.close();
    } catch {
      /* */
    }
  }
}

function runFake() {
  console.log(
    JSON.stringify({
      mode: "fake",
      banner: "FAKE face/error only — not a hardware proof",
    }),
  );
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vitest", "run", "src/trezor/connectHarness.test.ts"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  process.exit(r.status === 0 ? 0 : 1);
}

if (mode === "checklist" || mode === "device") {
  console.log(
    JSON.stringify({
      mode: "device",
      banner: "DEVICE checklist — real Connect wire",
    }),
  );
  printChecklist();
  process.exit(0);
}

if (mode === "lab") {
  await probeLab();
} else {
  runFake();
}
