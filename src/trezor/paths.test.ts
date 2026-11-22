import { describe, expect, it } from "vitest";
import { SCHEME_ID, ethAddressPath } from "./paths";

describe("SYNC0 paths", () => {
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
});
