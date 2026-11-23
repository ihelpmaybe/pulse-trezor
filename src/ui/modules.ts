/**
 * Optional face modules — keep the desk lean; opt in from Settings.
 */
const HEX_KEY = "pulse-perch-module-hex-v1";
const MASCOT_KEY = "pulse-perch-module-mascot-v1";

/** HEX stakes tab / marks / strip — not liquid HEX balance. */
export function loadHexModule(): boolean {
  try {
    return localStorage.getItem(HEX_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveHexModule(on: boolean) {
  try {
    localStorage.setItem(HEX_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Corner anime mascot — off by default. */
export function loadMascot(): boolean {
  try {
    return localStorage.getItem(MASCOT_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMascot(on: boolean) {
  try {
    localStorage.setItem(MASCOT_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
