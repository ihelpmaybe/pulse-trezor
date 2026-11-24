/**
 * Lab RBF proof on Anvil (software key) — same-nonce replace with higher fee.
 * Not a Trezor/device proof. Device evidence stays in docs/RBF-STUCK-PLAYBOOK.md.
 *
 *   anvil --port 8545
 *   node scripts/rbf-anvil-proof.mjs
 *
 * Env: ANVIL_URL (default http://127.0.0.1:8545)
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ANVIL_URL = process.env.ANVIL_URL || "http://127.0.0.1:8545";
/** Anvil default account #0 */
const PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const account = privateKeyToAccount(PK);
const transport = http(ANVIL_URL);
const publicClient = createPublicClient({ chain: foundry, transport });
const wallet = createWalletClient({
  account,
  chain: foundry,
  transport,
});

function bump125(n) {
  return (n * 125n) / 100n;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
const evidencePath = join(outDir, "RBF-ANVIL-EVIDENCE.md");

try {
  await publicClient.getBlockNumber();
} catch (e) {
  console.error(
    "ANVIL_DOWN — start anvil first:\n  anvil --port 8545\n",
    e?.message || e,
  );
  process.exit(2);
}

const nonce = await publicClient.getTransactionCount({
  address: account.address,
  blockTag: "pending",
});

const lowMax = parseGwei("1");
const lowTip = parseGwei("1");
const to = account.address;
const value = parseEther("0.0001");

console.log("send low-fee self-tx…", { nonce, from: account.address });
const hash1 = await wallet.sendTransaction({
  to,
  value,
  nonce,
  maxFeePerGas: lowMax,
  maxPriorityFeePerGas: lowTip,
  gas: 21_000n,
  chain: foundry,
});
console.log("oldHash", hash1);

const pending = await publicClient.getTransaction({ hash: hash1 });
if (pending.blockNumber != null) {
  console.warn(
    "WARN: tx already mined (anvil auto-mine). RBF still demonstrated by same-nonce second send with higher fee before mine — use anvil --no-mining for stuck face.",
  );
}

const hiMax = bump125(lowMax);
const hiTip = bump125(lowTip);
console.log("replace same nonce @ 1.25×…", {
  maxFeePerGas: hiMax.toString(),
  maxPriorityFeePerGas: hiTip.toString(),
});
const hash2 = await wallet.sendTransaction({
  to,
  value: 0n,
  nonce,
  maxFeePerGas: hiMax,
  maxPriorityFeePerGas: hiTip,
  gas: 21_000n,
  chain: foundry,
});
console.log("newHash", hash2);

// If anvil was started with --no-mining / automine off, advance one block.
try {
  await publicClient.request({
    method: "anvil_mine",
    params: ["0x1"],
  });
} catch {
  /* auto-mine anvil: ignore */
}

const receipt = await publicClient.waitForTransactionReceipt({
  hash: hash2,
  timeout: 15_000,
});

const ok = receipt.status === "success" && hash1 !== hash2;
const line = `| ${new Date().toISOString().slice(0, 10)} | anvil | ${account.address.slice(0, 10)}… | nonce ${nonce} | ${hash1.slice(0, 10)}… → ${hash2.slice(0, 10)}… | cancel-style 0-self @ 125% | ${ok ? "PASS" : "FAIL"} |`;

const md = `# Anvil RBF evidence (software — not Trezor)

Lab replace-by-fee on Anvil default key. Device proof remains OPEN until Suite + stuck mempool row in RBF-STUCK-PLAYBOOK.md.

| Date | Chain | From | Nonce | Hashes | Action | Result |
|------|-------|------|-------|--------|--------|--------|
${line}

\`\`\`
ANVIL_URL=${ANVIL_URL}
oldHash=${hash1}
newHash=${hash2}
status=${receipt.status}
\`\`\`
`;

writeFileSync(evidencePath, md, "utf8");
console.log(ok ? "RBF_ANVIL_PASS" : "RBF_ANVIL_FAIL");
console.log("wrote", evidencePath);
process.exit(ok ? 0 : 1);
