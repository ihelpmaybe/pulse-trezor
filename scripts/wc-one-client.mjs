/**
 * One isolated SignClient. Prints URI then SESSION or FAIL.
 * Env: REOWN_PROJECT_ID · WC_NAME · WC_HOLD_MS (stay alive after session)
 */
import { SignClient } from "@walletconnect/sign-client";

const projectId = (process.env.REOWN_PROJECT_ID || "").trim();
if (!projectId) {
  console.error("Set REOWN_PROJECT_ID (see .env.example)");
  process.exit(1);
}
const name = process.env.WC_NAME || "Perch Concurrent";
const holdMs = Number(process.env.WC_HOLD_MS || 120_000);

const client = await SignClient.init({
  projectId,
  metadata: {
    name,
    description: "concurrent session smoke",
    url: "https://lab.pulseperch.dev",
    icons: [],
  },
});

const { uri, approval } = await client.connect({
  optionalNamespaces: {
    eip155: {
      methods: ["personal_sign", "eth_sendTransaction"],
      chains: ["eip155:943", "eip155:369"],
      events: ["chainChanged", "accountsChanged"],
    },
  },
});

if (!uri) {
  console.log("FAIL no_uri");
  process.exit(1);
}
console.log("URI_READY");
console.log(uri);

try {
  const session = await Promise.race([
    approval(),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("approval timeout")), 90_000),
    ),
  ]);
  console.log("SESSION_OK");
  console.log(session.topic);
  await new Promise((r) => setTimeout(r, holdMs));
  process.exit(0);
} catch (e) {
  console.log("FAIL", e instanceof Error ? e.message : String(e));
  process.exit(1);
}
