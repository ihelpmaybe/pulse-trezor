/**
 * PWA maskable icons → public/icons/icon-192.png + icon-512.png
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

function hex(c) {
  return [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
    255,
  ];
}

const BG = hex("#07060c");
const RING = hex("#ff2bd6");
const DOT = hex("#9505fa");

function setPx(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = rgba[0];
  png.data[i + 1] = rgba[1];
  png.data[i + 2] = rgba[2];
  png.data[i + 3] = rgba[3];
}

function fillCircle(png, cx, cy, r, rgba, { ring = false, ringW = 0 } = {}) {
  const r2 = r * r;
  const inner = ring ? Math.max(0, r - ringW) : 0;
  const inner2 = inner * inner;
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (ring) {
        if (d2 <= r2 && d2 >= inner2) setPx(png, x, y, rgba);
      } else if (d2 <= r2) {
        setPx(png, x, y, rgba);
      }
    }
  }
}

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPx(png, x, y, BG);
  }
  const cx = size / 2;
  const cy = size / 2;
  fillCircle(png, cx, cy, size * (36 / 128), RING, {
    ring: true,
    ringW: Math.max(2, size * (8 / 128)),
  });
  fillCircle(png, cx, cy, size * (14 / 128), DOT);
  return PNG.sync.write(png);
}

for (const size of [192, 512]) {
  const path = join(OUT, `icon-${size}.png`);
  writeFileSync(path, makeIcon(size));
  console.log("WROTE", path);
}
console.log("PWA_ICONS_OK");
