import { describe, expect, it } from "vitest";
import { decodeApproveSpender } from "./approvals";

describe("decodeApproveSpender", () => {
  it("reads spender from approve calldata", () => {
    const data =
      "0x095ea7b3000000000000000000000000a58f22e0766b3764376c92915ba545d583c19dbc00000000000000000000000000000000000000000000003ba1910bf341b00000";
    expect(decodeApproveSpender(data)?.toLowerCase()).toBe(
      "0xa58f22e0766b3764376c92915ba545d583c19dbc",
    );
  });

  it("rejects empty", () => {
    expect(decodeApproveSpender("0x")).toBeNull();
    expect(decodeApproveSpender("0xa9059cbb" + "00".repeat(64))).toBeNull();
  });
});
