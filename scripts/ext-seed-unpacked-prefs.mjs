/**
 * Seed an unpacked MV3 into a Chrome user-data-dir Preferences (Chrome closed).
 * Chrome 157 ignores --load-extension; this is the lab workaround.
 *
 * Usage:
 *   node scripts/ext-seed-unpacked-prefs.mjs
 * Env: CHROME_PROFILE (default tmp-chrome-ext-lab2), EXT_DIR (default extension/)
 */
import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const profile = resolve(
  process.env.CHROME_PROFILE || join(repo, "tmp-chrome-ext-lab2"),
);
const extDir = resolve(process.env.EXT_DIR || join(repo, "extension"));
const manifest = JSON.parse(readFileSync(join(extDir, "manifest.json"), "utf8"));

/** Chromium unpacked id = sha256(utf16le path) → first 32 hex nibbles → a-p */
function extensionIdFromPath(absPath) {
  const normalized = absPath.replace(/\//g, "\\");
  const hash = createHash("sha256")
    .update(Buffer.from(normalized, "utf16le"))
    .digest("hex")
    .slice(0, 32);
  return hash
    .split("")
    .map((c) => String.fromCharCode(parseInt(c, 16) + 97))
    .join("");
}

const id = extensionIdFromPath(extDir);
const now = String(Date.now() * 1000); // Chrome uses microseconds-ish chrome time; string ok for lab

const entry = {
  account_extension_type: 0,
  active_permissions: {
    api: manifest.permissions || [],
    explicit_host: manifest.host_permissions || [],
    manifest_permissions: [],
    scriptable_host: (manifest.content_scripts || []).flatMap(
      (cs) => cs.matches || [],
    ),
  },
  commands: {},
  content_settings: [],
  creation_flags: 1,
  disable_reasons: [],
  from_webstore: false,
  granted_permissions: {
    api: manifest.permissions || [],
    explicit_host: manifest.host_permissions || [],
    manifest_permissions: [],
    scriptable_host: (manifest.content_scripts || []).flatMap(
      (cs) => cs.matches || [],
    ),
  },
  incognito_content_settings: [],
  incognito_preferences: {},
  location: 4, // UNPACKED
  manifest: { ...manifest, update_url: undefined },
  path: extDir.replace(/\//g, "\\"),
  preferences: {},
  was_installed_by_default: false,
  was_installed_by_oem: false,
  first_install_time: now,
  last_update_time: now,
  state: 1,
};

const defDir = join(profile, "Default");
mkdirSync(defDir, { recursive: true });
const prefPath = join(defDir, "Preferences");
let prefs = {};
if (existsSync(prefPath)) {
  try {
    prefs = JSON.parse(readFileSync(prefPath, "utf8"));
  } catch {
    prefs = {};
  }
}
prefs.extensions = prefs.extensions || {};
prefs.extensions.settings = prefs.extensions.settings || {};
prefs.extensions.settings[id] = entry;
prefs.extensions.ui = prefs.extensions.ui || {};
prefs.extensions.ui.developer_mode = true;

writeFileSync(prefPath, JSON.stringify(prefs));
console.log(
  JSON.stringify(
    { ok: true, id, path: entry.path, preferences: prefPath },
    null,
    2,
  ),
);
