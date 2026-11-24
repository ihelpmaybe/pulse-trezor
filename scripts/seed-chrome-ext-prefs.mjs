/**
 * Chrome 137+ often ignores --load-extension. Seed Default/Preferences so an
 * unpacked Pulse Perch path is registered (location=4) before lab Chrome starts.
 *
 * Usage: node scripts/seed-chrome-ext-prefs.mjs <profileDir> <extensionDir>
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const profileDir = resolve(process.argv[2] || "tmp-chrome-ext-lab");
const extDir = resolve(process.argv[3] || "extension");

/** Chromium unpacked id = first 16 bytes of SHA256(UTF-16LE path) → a–p nibbles. */
function extensionIdFromPath(absPath) {
  const normalized = absPath.replace(/\//g, "\\");
  const hash = createHash("sha256")
    .update(Buffer.from(normalized, "utf16le"))
    .digest();
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += String.fromCharCode(97 + (hash[i] >> 4));
    id += String.fromCharCode(97 + (hash[i] & 0xf));
  }
  return id;
}

if (!existsSync(extDir)) {
  console.error("NO_EXT", extDir);
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(join(extDir, "manifest.json"), "utf8"),
);
const id = extensionIdFromPath(extDir);
const defaultDir = join(profileDir, "Default");
mkdirSync(defaultDir, { recursive: true });
const prefPath = join(defaultDir, "Preferences");

let prefs = {};
if (existsSync(prefPath)) {
  try {
    prefs = JSON.parse(readFileSync(prefPath, "utf8"));
  } catch {
    prefs = {};
  }
}

prefs.extensions = prefs.extensions || {};
prefs.extensions.ui = { ...(prefs.extensions.ui || {}), developer_mode: true };
prefs.extensions.settings = prefs.extensions.settings || {};

const installTime = String(Date.now() * 1000); // Chrome uses µs-ish strings historically
prefs.extensions.settings[id] = {
  account_extension_type: 0,
  active_permissions: {
    api: [
      "scripting",
      "storage",
      "tabs",
      "offscreen",
    ],
    explicit_host: ["http://*/*", "https://*/*"],
    manifest_permissions: [],
    scriptable_host: ["http://*/*", "https://*/*"],
  },
  commands: {},
  content_settings: [],
  creation_flags: 1,
  disable_reasons: [],
  from_webstore: false,
  granted_permissions: {
    api: [
      "scripting",
      "storage",
      "tabs",
      "offscreen",
    ],
    explicit_host: ["http://*/*", "https://*/*"],
    manifest_permissions: [],
    scriptable_host: ["http://*/*", "https://*/*"],
  },
  install_time: installTime,
  location: 4,
  newAllowFileAccess: true,
  path: extDir.replace(/\//g, "\\"),
  was_installed_by_default: false,
  was_installed_by_oem: false,
  manifest: {
    ...manifest,
    // Chrome stores a subset; keep name/version for UI/smokes
    name: manifest.name,
    version: manifest.version,
    manifest_version: manifest.manifest_version,
  },
};

writeFileSync(prefPath, JSON.stringify(prefs), "utf8");
console.log(
  JSON.stringify({
    ok: true,
    id,
    path: extDir,
    version: manifest.version,
    prefs: prefPath,
  }),
);
