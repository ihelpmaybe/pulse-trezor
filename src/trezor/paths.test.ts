import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_PATH_TEMPLATE,
  SCHEME_ID,
  ethAddressPath,
  normalizePathTemplate,
  parsePathSegments,
  presetIdForTemplate,
  serializePathSegments,
  setPathTemplate,
  setSegmentAsIndex,
} from "./paths";

describe("SYNC0 paths", () => {
  beforeEach(() => {
    setPathTemplate(DEFAULT_PATH_TEMPLATE);
  });

  it("scheme id is pqq-metamask-bip44-v1", () => {
    expect(SCHEME_ID).toBe("pqq-metamask-bip44-v1");
  });

  it("index 0 = Account 1 MetaMask-style", () => {
    expect(ethAddressPath(0)).toBe("m/44'/60'/0'/0/0");
  });

  it("index 1 = second external address", () => {
    expect(ethAddressPath(1)).toBe("m/44'/60'/0'/0/1");
  });

  it("floors and clamps negative to 0", () => {
    expect(ethAddressPath(-3)).toBe("m/44'/60'/0'/0/0");
    expect(ethAddressPath(2.9)).toBe("m/44'/60'/0'/0/2");
  });

  it("rejects junk templates", () => {
    expect(normalizePathTemplate("nope").ok).toBe(false);
    expect(normalizePathTemplate("m/44'/60'/0'/0/{i}").ok).toBe(true);
  });

  it("presetIdForTemplate", () => {
    expect(presetIdForTemplate(DEFAULT_PATH_TEMPLATE)).toBe("metamask");
    expect(presetIdForTemplate("m/44'/60'/0'/0/5")).toBe("custom");
  });

  it("round-trips MetaMask segments", () => {
    const segs = parsePathSegments(DEFAULT_PATH_TEMPLATE);
    expect(segs).not.toBeNull();
    expect(serializePathSegments(segs!)).toBe(DEFAULT_PATH_TEMPLATE);
  });
});
