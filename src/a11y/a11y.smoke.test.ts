/**
 * Contract smoke — proves a11y plumbing is still wired.
 * Not a substitute for NVDA; catches regressions that strip labels/live regions.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { trapTabKey } from "./focusTrap";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, "..");

function src(rel: string) {
  return readFileSync(resolve(srcRoot, rel), "utf8");
}

describe("a11y contract smoke", () => {
  it("PulseTrezor keeps silent reader plumbing", () => {
    const t = src("PulseTrezor.tsx");
    expect(t).toMatch(/aria-live="polite"/);
    expect(t).toMatch(/role="alert"/);
    expect(t).toMatch(/trapTabKey/);
    expect(t).toMatch(/settingsBtnRef/);
    expect(t).toMatch(/Copied address \$\{active\.address\}/);
    expect(t).toMatch(/Address hidden/);
    expect(t).toMatch(/privacyHide/);
    expect(t).toMatch(/role="tabpanel"/);
    expect(t).toMatch(/aria-controls="perch-panel-send"/);
    expect(t).toMatch(/role="status"/);
  });

  it("WcPanel names session / sign prompts", () => {
    const t = src("wc/WcPanel.tsx");
    expect(t).toMatch(/aria-label=\{`Drop session/);
    expect(t).toMatch(/Session request from/);
    expect(t).toMatch(/role="region"/);
  });

  it("sr-only stylesheet exists", () => {
    expect(src("styles.css")).toMatch(/\.sr-only\s*\{/);
  });

  it("trapTabKey ignores non-Tab", () => {
    const rootEl = { querySelectorAll: () => [] } as unknown as HTMLElement;
    let prevented = false;
    trapTabKey(
      {
        key: "Escape",
        preventDefault: () => {
          prevented = true;
        },
      } as unknown as KeyboardEvent,
      rootEl,
    );
    expect(prevented).toBe(false);
  });
});
