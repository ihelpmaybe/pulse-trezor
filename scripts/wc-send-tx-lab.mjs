/**
 * Dapp-side WC lab: pair → eth_sendTransaction dust (self-send).
 * Prefer testnet 943 when Account #1 has tPLS.
 * Usage: node scripts/wc-send-tx-lab.mjs
 */
import { writeFileSync } from "node:fs";
import { SignClient } from "@walletconnect/sign-client";

const projectId = (process.env.REOWN_PROJECT_ID || "").trim();
if (!projectId) {
  console.error("Set REOWN_PROJECT_ID (see .env.example)");
  process.exit(1);
}
const chainPref = process.env.WC_CHAIN || "eip155:943";
const valueWei = process.env.WC_VALUE_WEI || "0x38d7ea4c68000"; // 0.001 PLS
/** Optional: wrap / contract call — e.g. WC_TO=WPLS WC_DATA=0xd0e30db0 */
const toOverride = process.env.WC_TO || "";
const dataOverride = process.env.WC_DATA || "0x";

const client = await SignClient.init({
  projectId,
  metadata: {
    name: "Perch WC Tx Lab",
    description: "eth_sendTransaction dust smoke",
    url: "https://lab.pulseperch.dev",
    icons: [],
  },
});

const { uri, approval } = await client.connect({
  optionalNamespaces: {
    eip155: {
      methods: [
        "eth_sendTransaction",
        "personal_sign",
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
const accounts = session.namespaces.eip155.accounts || [];
const pick =
  accounts.find((a) => a.startsWith(chainPref)) ||
  accounts.find((a) => a.startsWith("eip155:943")) ||
  accounts[0];
if (!pick) throw new Error("no eip155 account in session");
const [, , address] = pick.split(":");
const chainId = pick.split(":").slice(0, 2).join(":");
console.log("SESSION", session.topic, pick);

const tx = {
  from: address,
  to: toOverride || address,
  value: valueWei,
  data: dataOverride || "0x",
};
console.log("REQUEST_ETH_SEND", JSON.stringify(tx));
writeFileSync(
  "tmp-wc-tx-pending.json",
  JSON.stringify({ address, chainId, tx }, null, 2),
  "utf8",
);

try {
  const hash = await Promise.race([
    client.request({
      topic: session.topic,
      chainId,
      request: {
        method: "eth_sendTransaction",
        params: [tx],
      },
    }),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("eth_sendTransaction timeout 240s")), 240_000),
    ),
  ]);
  const out = { ok: true, address, chainId, tx, hash };
  writeFileSync("tmp-wc-tx.json", JSON.stringify(out, null, 2));
  console.log("TX_OK", hash);
  process.exit(0);
} catch (e) {
  const err =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e
        ? JSON.stringify(e, Object.getOwnPropertyNames(e))
        : String(e);
  writeFileSync(
    "tmp-wc-tx.json",
    JSON.stringify({ ok: false, address, chainId, tx, err }, null, 2),
  );
  console.error("TX_FAIL", err);
  process.exit(1);
}
