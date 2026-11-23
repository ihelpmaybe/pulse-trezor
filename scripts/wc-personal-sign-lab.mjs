/**
 * Dapp-side WC lab: print pairing URI → wait for Perch approve → personal_sign.
 * Usage: node scripts/wc-personal-sign-lab.mjs
 */
import { writeFileSync } from "node:fs";
import { SignClient } from "@walletconnect/sign-client";

const projectId =
  process.env.REOWN_PROJECT_ID || "eb3cea87fdb235c24fbdf42761c00e63";
const msg = `Pulse Perch live WC smoke ${Date.now()}`;
const msgHex =
  "0x" + Buffer.from(msg, "utf8").toString("hex");

const client = await SignClient.init({
  projectId,
  metadata: {
    name: "Perch WC Lab",
    description: "personal_sign smoke dapp",
    // Must not be a raw IP — Perch phishing gate blocks Approve on 127.0.0.1
    url: "https://lab.pulseperch.dev",
    icons: [],
  },
});

const { uri, approval } = await client.connect({
  optionalNamespaces: {
    eip155: {
      methods: [
        "personal_sign",
        "eth_sign",
        "eth_sendTransaction",
        "eth_signTypedData_v4",
      ],
      chains: ["eip155:943", "eip155:369"],
      events: ["chainChanged", "accountsChanged"],
    },
  },
});

if (!uri) throw new Error("no pairing uri");
writeFileSync("tmp-wc-uri.txt", uri, "utf8");
console.log("URI_READY");
console.log(uri);

const session = await approval();
const account = session.namespaces.eip155.accounts[0];
const address = account.split(":")[2];
const chainId = account.split(":").slice(0, 2).join(":");
console.log("SESSION", session.topic, account);

console.log("REQUEST_PERSONAL_SIGN");
writeFileSync("tmp-wc-sign-pending.json", JSON.stringify({ address, chainId, msg }), "utf8");

try {
  const sig = await Promise.race([
    client.request({
      topic: session.topic,
      chainId,
      request: {
        method: "personal_sign",
        params: [msgHex, address],
      },
    }),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("personal_sign timeout 180s")), 180_000),
    ),
  ]);

  const out = { ok: true, address, chainId, msg, sig };
  writeFileSync("tmp-wc-sign.json", JSON.stringify(out, null, 2));
  console.log("SIG_OK", sig);
  process.exit(0);
} catch (e) {
  const err = e instanceof Error ? e.message : String(e);
  writeFileSync(
    "tmp-wc-sign.json",
    JSON.stringify({ ok: false, address, chainId, msg, err }, null, 2),
  );
  console.error("SIG_FAIL", err);
  process.exit(1);
}
