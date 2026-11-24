import { describe, expect, it } from "vitest";
import { connectAppIconUrl } from "./connect";

describe("connectAppIconUrl", () => {
  it("points Suite at a 192 icon under the app origin", () => {
    expect(connectAppIconUrl("http://127.0.0.1:5174")).toBe(
      "http://127.0.0.1:5174/icons/icon-192.png",
    );
    expect(connectAppIconUrl("https://perch.example/")).toBe(
      "https://perch.example/icons/icon-192.png",
    );
  });
});
