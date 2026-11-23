import { describe, expect, it } from "vitest";
import { parseTypedDataParams } from "./signMessage";

const sample = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
    ],
    Mail: [{ name: "contents", type: "string" }],
  },
  primaryType: "Mail",
  domain: { name: "Pulse Perch", version: "1", chainId: 943 },
  message: { contents: "inject smoke" },
};

describe("parseTypedDataParams", () => {
  it("parses [address, object]", () => {
    const { address, data } = parseTypedDataParams([
      "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
      sample,
    ]);
    expect(address?.toLowerCase()).toContain("0x73d0");
    expect(data.primaryType).toBe("Mail");
  });

  it("parses JSON string", () => {
    const { data } = parseTypedDataParams([JSON.stringify(sample)]);
    expect(data.message.contents).toBe("inject smoke");
  });
});
