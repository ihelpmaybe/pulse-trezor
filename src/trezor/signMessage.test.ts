import { describe, expect, it } from "vitest";
import { buildTypedDataConnectParams, parseTypedDataParams } from "./signMessage";

const sample = {
  types: {
    EIP712Domain: [{ name: "name", type: "string" }],
    Mail: [{ name: "contents", type: "string" }],
  },
  primaryType: "Mail",
  domain: { name: "example.trezor.io" },
  message: { contents: "Hello" },
};

describe("official Connect 10 typed-data params", () => {
  it("builds data-only recipe with show_message_hash", () => {
    const p = buildTypedDataConnectParams(sample);
    expect(p.metamask_v4_compat).toBe(true);
    expect(p.show_message_hash).toBe(true);
    expect(p.data).toEqual(sample);
    expect(p.domain_separator_hash).toBeUndefined();
    expect(p.message_hash).toBeUndefined();
  });

  it("attaches hash fallback when provided", () => {
    const p = buildTypedDataConnectParams(sample, {
      domain_separator_hash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      message_hash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
    });
    expect(p.domain_separator_hash?.startsWith("0x")).toBe(true);
    expect(p.message_hash?.startsWith("0x")).toBe(true);
  });

  it("parses WC [address, json] order", () => {
    const { address, data } = parseTypedDataParams([
      "0x00000000000000000000000000000000000000a1",
      JSON.stringify(sample),
    ]);
    expect(address?.toLowerCase()).toContain("a1");
    expect(data.primaryType).toBe("Mail");
  });
});
