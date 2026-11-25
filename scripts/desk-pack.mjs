/**
 * Zip dist/ → release/pulse-perch-<ver>-web.zip + .sha256
 * Includes Windows Open-Pulse-Perch.cmd + serve-desk.ps1 for normie local run.
 * Thin portable pack — not Electron/notarize.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const ver = pkg.version || "0.0.0";
const outDir = join(root, "release");
const zipName = `pulse-perch-${ver}-web.zip`;
const zipPath = join(outDir, zipName);

if (!existsSync(dist)) {
  console.error("dist/ missing — run npm run build first");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const launcherCmd = join(root, "scripts", "Open-Pulse-Perch.cmd");
const launcherPs = join(root, "scripts", "serve-desk.ps1");
const readmeLocal = join(dist, "README-OPEN.txt");
writeFileSync(
  readmeLocal,
  [
    "Pulse Perch — portable desk",
    "",
    "Windows: double-click Open-Pulse-Perch.cmd",
    "  → opens http://127.0.0.1:5174/  (leave the black window open)",
    "",
    "Then: unlock Trezor Suite → Connect in Perch → confirm address on device.",
    "No seed in the browser. SHA256 of this zip is on GitHub Releases.",
    "",
  ].join("\r\n"),
);
if (existsSync(launcherCmd)) copyFileSync(launcherCmd, join(dist, "Open-Pulse-Perch.cmd"));
if (existsSync(launcherPs)) copyFileSync(launcherPs, join(dist, "serve-desk.ps1"));

const isWin = process.platform === "win32";
let ok = false;
if (isWin) {
  const ps = [
    `Compress-Archive -Path '${dist}\\*' -DestinationPath '${zipPath}' -Force`,
  ].join(" ");
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { stdio: "inherit" },
  );
  ok = r.status === 0;
} else {
  const r = spawnSync("zip", ["-r", zipPath, "."], {
    cwd: dist,
    stdio: "inherit",
  });
  ok = r.status === 0;
}

if (!ok || !existsSync(zipPath)) {
  console.error("zip failed");
  process.exit(1);
}

const buf = readFileSync(zipPath);
const sha = createHash("sha256").update(buf).digest("hex");
writeFileSync(`${zipPath}.sha256`, `${sha}  ${zipName}\n`);
console.log(`desk-pack: ${zipPath}`);
console.log(`sha256: ${sha}`);
