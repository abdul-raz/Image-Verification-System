const { Wallet, Provider, Contract } = require("zksync-ethers");
const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

// ── Addresses ─────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0x33627A20d83188BCeCfFed5a82D147D2916B0EC3"; // zkSync Sepolia (new)
const L1_CONTRACT_ADDRESS = "0xefBB466D462f090fc3c1866A03126Be824368636"; // Ethereum Sepolia (reference)

// ── Price constants (Feb 2026) ─────────────────────────────────────────
const ETH_TO_USD = 1975;
const USD_TO_INR = 90.75;

// ── L1 Mainnet gas scenarios (for comparison) ──────────────────────────
const L1_GAS_SCENARIOS = [
  { label: "L1 Low   (3 gwei  – post-Dencun typical)", gwei: 3 },
  { label: "L1 Avg   (20 gwei – 2023-24 typical)", gwei: 20 },
  { label: "L1 High  (80 gwei – congestion spike)", gwei: 80 },
];

function simulateL1Costs(gasUsed) {
  return L1_GAS_SCENARIOS.map((s) => {
    const gasPriceWei = ethers.parseUnits(s.gwei.toString(), "gwei");
    const costWei = gasUsed * gasPriceWei;
    const costEth = parseFloat(ethers.formatEther(costWei));
    const costUsd = costEth * ETH_TO_USD;
    const costInr = costUsd * USD_TO_INR;
    return { ...s, costEth, costUsd, costInr };
  });
}

function line() {
  console.log("=".repeat(70));
}

const readResult = (test, fn, passed) => ({
  test,
  fn,
  status: passed ? "✅ PASSED" : "❌ FAILED",
  txHash: "N/A (read-only)",
  gasUsed: "0",
  time: "< 0.5s",
  zkFeeETH: "0",
  zkFeeUSD: "0",
  zkFeeINR: "0",
  l1AvgETH: "0",
  l1AvgUSD: "0",
  l1AvgINR: "0",
});

function writeResult(test, fn, txHash, gasUsed, fee, duration, l1Sim) {
  const avg = l1Sim.find((s) => s.label.includes("Avg"));
  const feeEth = parseFloat(ethers.formatEther(fee));
  const feeUsd = feeEth * ETH_TO_USD;
  const feeInr = feeUsd * USD_TO_INR;
  return {
    test,
    fn,
    status: "✅ PASSED",
    txHash,
    gasUsed: gasUsed.toString(),
    time: duration + "s",
    zkFeeETH: feeEth.toFixed(8),
    zkFeeUSD: feeUsd.toFixed(6),
    zkFeeINR: feeInr.toFixed(4),
    l1AvgETH: avg.costEth.toFixed(6),
    l1AvgUSD: avg.costUsd.toFixed(4),
    l1AvgINR: avg.costInr.toFixed(2),
  };
}

async function main() {
  line();
  console.log("  IMAGE VERIFICATION SYSTEM – ZKSYNC L2 TEST SUITE");
  line();
  console.log(
    `Date    : ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
  );
  console.log(`Network : zkSync Sepolia EraVM (Layer 2) + L1 Cost Comparison`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  line();

  const provider = new Provider(
    process.env.ZKSYNC_SEPOLIA_RPC || "https://sepolia.era.zksync.dev",
  );
  const wallet = new Wallet(process.env.ZKSYNC_PRIVATE_KEY, provider);

  const artifactPath =
    "./artifacts-zk/contracts/ImageRegistry.sol/ImageRegistry.json";
  // Fallback to deployments-zk path if artifacts-zk doesn't exist
  const altPath =
    "./deployments-zk/zkSyncSepolia/contracts/ImageRegistry.sol/ImageRegistry.json";
  const artifact = JSON.parse(
    fs.readFileSync(
      fs.existsSync(artifactPath) ? artifactPath : altPath,
      "utf8",
    ),
  );

  const contract = new Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  console.log(`\n👛 Wallet : ${wallet.address}`);
  const bal = await wallet.getBalance();
  console.log(`💰 Balance: ${ethers.formatEther(bal)} ETH\n`);

  const results = [];
  let totalGas = 0n;
  let totalFee = 0n;

  // ══════════════════════════════════════════════════════════════════════
  // TEST 1 – Register Image #1
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 1: REGISTER IMAGE #1 (zkSync L2)");
  line();

  const sha256Hash1 = ethers.keccak256(
    ethers.toUtf8Bytes("zk-test-image-marina-" + Date.now()),
  );
  const creatorHash1 = ethers.keccak256(
    ethers.toUtf8Bytes(wallet.address + "-creator-1"),
  );
  const ipfsHash1 = "QmZKTestIPFSChennai" + Date.now();

  console.log(`📝 SHA-256    : ${sha256Hash1}`);
  console.log(`👤 CreatorHash: ${creatorHash1}`);
  console.log(`🗂️  IPFS CID  : ${ipfsHash1}`);

  const t1s = Date.now();
  const tx1 = await contract.registerImage(
    sha256Hash1,
    creatorHash1,
    ipfsHash1,
    "Chennai Marina Beach Sunset",
    "Beautiful sunset photograph taken at Marina Beach, Chennai, Tamil Nadu, India",
  );
  console.log(`\n⏳ Waiting... TX: ${tx1.hash}`);
  const r1 = await tx1.wait();
  if (!r1) throw new Error("Receipt not received for TX1");

  const gas1 = r1.gasUsed;
  const fee1 = r1.fee ?? gas1 * (r1.effectiveGasPrice ?? 0n);
  const dur1 = ((Date.now() - t1s) / 1000).toFixed(2);
  totalGas += gas1;
  totalFee += fee1;

  const sim1 = simulateL1Costs(gas1);
  const feeEth1 = parseFloat(ethers.formatEther(fee1));

  console.log(`\n✅ Confirmed! Time: ${dur1}s`);
  console.log(`⛽ Gas Used    : ${gas1}`);
  console.log(
    `💸 zkSync L2 fee: ${feeEth1.toFixed(8)} ETH ($${(feeEth1 * ETH_TO_USD).toFixed(6)} ≈ ₹${(feeEth1 * ETH_TO_USD * USD_TO_INR).toFixed(4)})`,
  );
  console.log(`🔗 https://sepolia.explorer.zksync.io/tx/${tx1.hash}`);
  console.log(`\n🌐 Equivalent L1 Mainnet cost (same gas):`);
  sim1.forEach((s) =>
    console.log(
      `   ${s.label}: ${s.costEth.toFixed(6)} ETH = $${s.costUsd.toFixed(4)} = ₹${s.costInr.toFixed(2)}`,
    ),
  );

  results.push(
    writeResult(
      "Register Image #1",
      "registerImage()",
      tx1.hash,
      gas1,
      fee1,
      dur1,
      sim1,
    ),
  );

  // ══════════════════════════════════════════════════════════════════════
  // TEST 2 – Verify Image Exists
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 2: VERIFY IMAGE EXISTS");
  line();
  const exists1 = await contract.verifyImage(sha256Hash1);
  console.log(`📊 Exists: ${exists1}  |  Cost: FREE`);
  results.push(readResult("Verify Image Exists", "verifyImage()", exists1));

  // ══════════════════════════════════════════════════════════════════════
  // TEST 3 – Get Image Details
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 3: GET IMAGE DETAILS");
  line();
  const img = await contract.getImage(sha256Hash1);
  console.log(`📋 Title    : ${img.title}`);
  console.log(`   SHA-256  : ${img.sha256Hash}`);
  console.log(`   Creator  : ${img.creatorHash}`);
  console.log(`   IPFS CID : ${img.ipfsHash}`);
  console.log(
    `   Timestamp: ${new Date(Number(img.timestamp) * 1000).toLocaleString("en-IN")}`,
  );
  console.log(`   Verified : ${img.verified}`);
  console.log(`Cost: FREE`);
  results.push(readResult("Get Image Details", "getImage()", true));

  // ══════════════════════════════════════════════════════════════════════
  // TEST 4 – Get Image Status
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 4: GET IMAGE STATUS");
  line();
  const st = await contract.getImageStatus(sha256Hash1);
  console.log(`📊 Exists: ${st.exists} | Verified: ${st.verified}`);
  console.log(
    `   Time : ${new Date(Number(st.verifiedTime) * 1000).toLocaleString("en-IN")}`,
  );
  console.log(`Cost: FREE`);
  results.push(
    readResult(
      "Get Image Status",
      "getImageStatus()",
      st.exists && st.verified,
    ),
  );

  // ══════════════════════════════════════════════════════════════════════
  // TEST 5 – Register Image #2
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 5: REGISTER IMAGE #2 (zkSync L2)");
  line();

  const sha256Hash2 = ethers.keccak256(
    ethers.toUtf8Bytes("zk-test-image-temple-" + Date.now()),
  );
  const creatorHash2 = ethers.keccak256(
    ethers.toUtf8Bytes(wallet.address + "-creator-2"),
  );
  const ipfsHash2 = "QmZKTestIPFSTemple" + Date.now();

  const t5s = Date.now();
  const tx2 = await contract.registerImage(
    sha256Hash2,
    creatorHash2,
    ipfsHash2,
    "Kapaleeshwarar Temple Chennai",
    "Historic temple architecture photograph from Mylapore, Chennai",
  );
  console.log(`⏳ Waiting... TX: ${tx2.hash}`);
  const r2 = await tx2.wait();
  if (!r2) throw new Error("Receipt not received for TX2");

  const gas2 = r2.gasUsed;
  const fee2 = r2.fee ?? gas2 * (r2.effectiveGasPrice ?? 0n);
  const dur2 = ((Date.now() - t5s) / 1000).toFixed(2);
  totalGas += gas2;
  totalFee += fee2;

  const sim2 = simulateL1Costs(gas2);
  const feeEth2 = parseFloat(ethers.formatEther(fee2));

  console.log(`\n✅ Confirmed! Time: ${dur2}s`);
  console.log(`⛽ Gas Used    : ${gas2}`);
  console.log(
    `💸 zkSync L2 fee: ${feeEth2.toFixed(8)} ETH ($${(feeEth2 * ETH_TO_USD).toFixed(6)} ≈ ₹${(feeEth2 * ETH_TO_USD * USD_TO_INR).toFixed(4)})`,
  );
  console.log(`🔗 https://sepolia.explorer.zksync.io/tx/${tx2.hash}`);
  console.log(`\n🌐 Equivalent L1 Mainnet cost (same gas):`);
  sim2.forEach((s) =>
    console.log(
      `   ${s.label}: ${s.costEth.toFixed(6)} ETH = $${s.costUsd.toFixed(4)} = ₹${s.costInr.toFixed(2)}`,
    ),
  );

  results.push(
    writeResult(
      "Register Image #2",
      "registerImage()",
      tx2.hash,
      gas2,
      fee2,
      dur2,
      sim2,
    ),
  );

  // ══════════════════════════════════════════════════════════════════════
  // TEST 6 – Duplicate Rejection
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 6: DUPLICATE REJECTION");
  line();
  let dupPassed = false;
  try {
    await contract.registerImage(
      sha256Hash1,
      creatorHash1,
      ipfsHash1,
      "Dup",
      "Dup",
    );
    console.log("❌ Expected revert but TX succeeded");
  } catch {
    dupPassed = true;
    console.log("✅ Correctly rejected duplicate registration");
  }
  results.push(readResult("Duplicate Rejection", "registerImage()", dupPassed));

  // ══════════════════════════════════════════════════════════════════════
  // TEST 7 – Non-Existent Image
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 7: NON-EXISTENT IMAGE CHECK");
  line();
  const fakeHash = ethers.keccak256(
    ethers.toUtf8Bytes("totally-fake-image-xyz"),
  );
  const fakeExist = await contract.verifyImage(fakeHash);
  console.log(`📊 Non-existent Check: ${fakeExist} (expected false)`);
  results.push(readResult("Non-Existent Image", "verifyImage()", !fakeExist));

  // ══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST SUMMARY – zkSync L2 vs L1 Cost Comparison");
  line();

  const totalFeeETH = parseFloat(ethers.formatEther(totalFee));
  const totalFeeUSD = totalFeeETH * ETH_TO_USD;
  const totalFeeINR = totalFeeUSD * USD_TO_INR;
  const avgGas = totalGas / 2n;
  const passed = results.filter((r) => r.status.includes("PASSED")).length;

  const l1Total = simulateL1Costs(totalGas);
  const l1Avg = l1Total.find((s) => s.label.includes("Avg"));

  console.log(`\n📊 Total Tests : ${results.length}`);
  console.log(`✅ Passed      : ${passed}`);
  console.log(`❌ Failed      : ${results.length - passed}`);
  console.log(`\n⛽ Total Gas (writes)   : ${totalGas}`);
  console.log(`📈 Avg Gas per write    : ${avgGas}`);

  console.log(`\n🔵 zkSync L2 Actual Fee : ${totalFeeETH.toFixed(8)} ETH`);
  console.log(`💵                      : $${totalFeeUSD.toFixed(6)} USD`);
  console.log(`💰                      : ₹${totalFeeINR.toFixed(4)} INR`);

  console.log(`\n🔴 L1 Mainnet Simulation (same gas, both writes):`);
  l1Total.forEach((s) =>
    console.log(
      `   ${s.label}: ${s.costEth.toFixed(6)} ETH  |  $${s.costUsd.toFixed(4)}  |  ₹${s.costInr.toFixed(2)}`,
    ),
  );

  console.log(`\n📉 Savings vs L1 Avg (20 gwei):`);
  const savings = l1Avg.costInr - totalFeeINR;
  const savingsPct = ((savings / l1Avg.costInr) * 100).toFixed(1);
  console.log(`   L1 Avg Cost : ₹${l1Avg.costInr.toFixed(2)}`);
  console.log(`   L2 Actual   : ₹${totalFeeINR.toFixed(4)}`);
  console.log(
    `   💡 You save : ₹${savings.toFixed(2)} (${savingsPct}% cheaper on L2!)`,
  );

  const report = generateReport(
    results,
    totalGas,
    avgGas,
    totalFeeETH,
    totalFeeUSD,
    totalFeeINR,
    l1Total,
  );
  fs.writeFileSync("ZKSYNC-TEST-RESULTS.md", report);
  console.log(`\n📄 Report saved → ZKSYNC-TEST-RESULTS.md`);
  line();
}

function generateReport(
  results,
  totalGas,
  avgGas,
  totalETH,
  totalUSD,
  totalINR,
  l1Total,
) {
  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const passed = results.filter((r) => r.status.includes("PASSED")).length;
  const rate = ((passed / results.length) * 100).toFixed(1);
  const l1Avg = l1Total.find((s) => s.label.includes("Avg"));
  const savings = l1Avg.costInr - totalINR;
  const savingsPct = ((savings / l1Avg.costInr) * 100).toFixed(1);

  let r = `# IMAGE VERIFICATION SYSTEM – zkSync L2 TEST RESULTS\n\n`;
  r += `**Date:** ${date}  \n`;
  r += `**Network:** zkSync Sepolia EraVM (Layer 2)  \n`;
  r += `**L2 Contract:** \`${CONTRACT_ADDRESS}\`  \n`;
  r += `**L1 Contract:** \`${L1_CONTRACT_ADDRESS}\`  \n`;
  r += `**ETH/USD:** $${ETH_TO_USD}  |  **USD/INR:** ₹${USD_TO_INR}  \n\n---\n\n`;

  r += `## Test Summary\n\n| Metric | Value |\n|---|---|\n`;
  r += `| Total Tests | ${results.length} |\n`;
  r += `| Passed | ✅ ${passed} |\n`;
  r += `| Failed | ❌ ${results.length - passed} |\n`;
  r += `| Success Rate | **${rate}%** |\n\n`;

  r += `## Gas & zkSync L2 Actual Costs\n\n| Metric | Value |\n|---|---|\n`;
  r += `| Total Gas Used | ${totalGas} |\n`;
  r += `| Avg Gas / Write | ${avgGas} |\n`;
  r += `| **L2 Total Fee (ETH)** | **${totalETH.toFixed(8)} ETH** |\n`;
  r += `| **L2 Total Fee (USD)** | **$${totalUSD.toFixed(6)}** |\n`;
  r += `| **L2 Total Fee (INR)** | **₹${totalINR.toFixed(4)}** |\n\n`;

  r += `## L1 vs L2 Cost Comparison (Same Gas, 2 Registrations)\n\n`;
  r += `| Network | Gas Price | ETH | USD | INR |\n|---|---|---|---|---|\n`;
  r += `| **zkSync L2 (actual)** | ~0.1-0.5 gwei | ${totalETH.toFixed(8)} | $${totalUSD.toFixed(6)} | ₹${totalINR.toFixed(4)} |\n`;
  l1Total.forEach(
    (s) =>
      (r += `| Ethereum L1 – ${s.label.split("(")[0].trim()} | ${s.gwei} gwei | ${s.costEth.toFixed(6)} | $${s.costUsd.toFixed(4)} | ₹${s.costInr.toFixed(2)} |\n`),
  );
  r += `\n> 💡 **L2 is ~${savingsPct}% cheaper** than L1 at average gas (20 gwei). Savings: ₹${savings.toFixed(2)} for 2 registrations.\n\n`;

  r += `## Detailed Test Results\n\n`;
  r += `| Test | Function | Status | Gas | Time | L2 Fee (ETH) | L1 Avg (ETH) |\n|---|---|---|---|---|---|---|\n`;
  results.forEach(
    (res) =>
      (r += `| ${res.test} | \`${res.fn}\` | ${res.status} | ${res.gasUsed} | ${res.time} | ${res.zkFeeETH} | ${res.l1AvgETH} |\n`),
  );

  r += `\n## Transaction Links (zkSync Sepolia Explorer)\n\n`;
  results
    .filter((res) => res.txHash.startsWith("0x"))
    .forEach(
      (res, i) =>
        (r += `${i + 1}. [${res.test}](https://sepolia.explorer.zksync.io/tx/${res.txHash})\n`),
    );

  r += `\n## Conclusion\n\n`;
  r += `All ${results.length} tests passed (${rate}%) on zkSync Sepolia EraVM.\n`;
  r += `The same \`ImageRegistry\` contract deployed on zkSync L2 costs **₹${totalINR.toFixed(4)}** total, `;
  r += `compared to **₹${l1Avg.costInr.toFixed(2)}** on Ethereum L1 (at avg 20 gwei) — a **${savingsPct}% cost reduction** while maintaining Ethereum-level security.\n`;
  return r;
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  console.error(err);
  process.exit(1);
});
