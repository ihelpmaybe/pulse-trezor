import { describe, expect, it } from "vitest";
import { en, t } from "./en";

describe("en locale map", () => {
  it("has first-run and Suite Allow keys", () => {
    expect(t("firstRunTitle")).toBeTruthy();
    expect(t("suiteAllowTitle")).toMatch(/Suite/i);
    expect(Object.keys(en).length).toBeGreaterThan(15);
  });

  it("covers connect / send / stakes face labels", () => {
    expect(t("startConnection")).toMatch(/Start connection/i);
    expect(t("stopWaiting")).toMatch(/Stop waiting/i);
    expect(t("disconnect")).toMatch(/Disconnect/i);
    expect(t("signSend")).toMatch(/Sign/i);
    expect(t("stakesClearSign")).toMatch(/Apps/i);
    expect(t("openAppsBtn")).toMatch(/Apps/i);
  });

  it("covers Settings / Migrate / WC soft-path keys", () => {
    expect(t("updatesHint")).toMatch(/No auto-updater/i);
    expect(t("migrateStepSuite")).toMatch(/Suite/i);
    expect(t("wcTxCoach")).toMatch(/PLS for gas/i);
    expect(t("signOnTrezor")).toMatch(/Trezor/i);
    expect(t("suiteDesktopLinked")).toMatch(/Suite/i);
  });

  it("covers Approve / Swap / Offline / RBF / metrics keys", () => {
    expect(t("approveHint")).toMatch(/Apps/i);
    expect(t("signSwap")).toMatch(/swap/i);
    expect(t("offlineBanner")).toMatch(/Offline/i);
    expect(t("rbfCoach")).toMatch(/Speed up/i);
    expect(t("metricsOptInBlurb")).toMatch(/never phones home/i);
  });

  it("covers Install / Receive / Activity / ship honesty", () => {
    expect(t("installPulsePerch")).toMatch(/Install/i);
    expect(t("copyPayUri")).toMatch(/URI/i);
    expect(t("activityFilter")).toMatch(/Activity/i);
    expect(t("pathLoadWallet")).toMatch(/Load/i);
    expect(t("shipSurfacesHint")).toMatch(/not a goal/i);
  });
});




