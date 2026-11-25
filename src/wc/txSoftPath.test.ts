import { describe, expect, it } from "vitest";
import { softenWcSendError, wcSendTxCoach } from "./txSoftPath";

describe("wc tx soft path", () => {
  it("coaches send without claiming hash", () => {
    expect(wcSendTxCoach()).toMatch(/PLS for gas/i);
    expect(wcSendTxCoach()).toMatch(/943/i);
  });

  it("softens insufficient balance", () => {
    expect(softenWcSendError("insufficient funds for gas")).toMatch(/Not enough PLS/i);
    expect(softenWcSendError("execution reverted: transfer amount exceeds balance")).toMatch(
      /Not enough PLS|fund the bag/i,
    );
  });

  it("softens Suite / Confirm waits", () => {
    expect(softenWcSendError("Popup closed by user")).toMatch(/Suite Confirm/i);
    expect(softenWcSendError("Method_Cancel")).toMatch(/Suite Confirm/i);
  });

  it("leaves unrelated errors alone", () => {
    expect(softenWcSendError("relay No matching key")).toBeNull();
  });
});
