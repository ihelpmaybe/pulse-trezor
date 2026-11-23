/**
 * Zip extension/ for sideload / future store upload.
 * Out: dist-ext/pulse-perch-extension-<version>.zip
 */
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { pipeline } from "node:stream/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXT = join(ROOT, "extension");
const OUT_DIR = join(ROOT, "dist-ext");
const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
const version = manifest.version || "0.0.0";
const zipName = `pulse-perch-extension-${version}.zip`;
const zipPath = join(OUT_DIR, zipName);

mkdirSync(OUT_DIR, { recursive: true });

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "README.md") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const require = createRequire(import.meta.url);
let Archiver;
try {
  Archiver = require("archiver");
} catch {
  /* fallback: PowerShell Compress-Archive via child */
}

if (Archiver) {
  const files = walk(EXT);
  const output = createWriteStream(zipPath);
  const archive = Archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);
  for (const file of files) {
    archive.file(file, { name: relative(EXT, file).replace(/\\/g, "/") });
  }
  await archive.finalize();
  await new Promise((res, rej) => {
    output.on("close", res);
    output.on("error", rej);
  });
} else {
  const { spawnSync } = await import("node:child_process");
  const ps = `
    $ErrorActionPreference='Stop'
    $src='${EXT.replace(/'/g, "''")}'
    $dst='${zipPath.replace(/'/g, "''")}'
    if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Force }
    Compress-Archive -Path (Join-Path $src '*') -DestinationPath $dst -Force
    Write-Output $dst
  `;
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stdout || r.stderr);
    process.exit(1);
  }
}

const size = statSync(zipPath).size;
console.log(JSON.stringify({ ok: true, zip: zipPath, bytes: size, version }));
console.log("EXT_PACK_OK");
