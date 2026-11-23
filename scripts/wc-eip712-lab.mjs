/**
 * Dapp-side WC lab: pair → eth_signTypedData_v4.
 * Usage: node scripts/wc-eip712-lab.mjs
 */
import { writeFileSync } from "node:fs";
import { SignClient } from "@walletconnect/sign-client";

const projectId = (process.env.REOWN_PROJECT_ID || "").trim();
if (!projectId) {
  console.error("Set REOWN_PROJECT_ID (see .env.example)");
  process.exit(1);
}
const chainPref = process.env.WC_CHAIN || "eip155:943";
const chainNum = Number(chainPref.split(":")[1] || 943);

const typedData = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
    ],
    Mail: [{ name: "contents", type: "string" }],
  },
  primaryType: "Mail",
  domain: {
    name: "Pulse Perch",
    version: "1",
    chainId: chainNum,
  },
  message: {
    contents: `EIP-712 WC smoke ${Date.now()}`,
  },
};

const client = await SignClient.init({
  projectId,
  metadata: {
    name: "Perch WC EIP-712 Lab",
    description: "eth_signTypedData_v4 smoke",
    url: "https://lab.pulseperch.dev",
    icons: [],
  },
});

const { uri, approval } = await client.connect({
  optionalNamespaces: {
    eip155: {
      methods: [
        "eth_signTypedData_v4",
        "personal_sign",
        "eth_sendTransaction",
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

console.log("REQUEST_EIP712", typedData.message.contents);
writeFileSync(
  "tmp-wc-eip712-pending.json",
  JSON.stringify({ address, chainId, typedData }, null, 2),
  "utf8",
);

try {
  const sig = await Promise.race([
    client.request({
      topic: session.topic,
      chainId,
      request: {
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)],
      },
    }),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("eth_signTypedData_v4 timeout 180s")), 180_000),
    ),
  ]);
  const out = { ok: true, address, chainId, typedData, sig };
  writeFileSync("tmp-wc-eip712.json", JSON.stringify(out, null, 2));
  console.log("SIG_OK", sig);
  process.exit(0);
} catch (e) {
  const err =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null
        ? JSON.stringify(e)
        : String(e);
  writeFileSync(
    "tmp-wc-eip712.json",
    JSON.stringify({ ok: false, address, chainId, typedData, err }, null, 2),
  );
  console.error("SIG_FAIL", err);
  process.exit(1);
}
