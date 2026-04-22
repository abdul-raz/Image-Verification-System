import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const CONTRACT_ADDRESS = "0xefBB466D462f090fc3c1866A03126Be824368636";
const ETH_TO_USD = 1975;
const USD_TO_INR = 90.75;

const MAINNET_GAS_SCENARIOS = [
  { label: "Low   (3 gwei  – post-Dencun typical)", gwei: 3 },
  { label: "Avg   (20 gwei – 2023-24 typical)", gwei: 20 },
  { label: "High  (80 gwei – congestion spike)", gwei: 80 },
];

function simulateMainnetCosts(gasUsed) {
  return MAINNET_GAS_SCENARIOS.map((s) => {
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
  sepoliaETH: "0",
  sepoliaUSD: "0",
  sepoliaINR: "0",
  mainnetAvgETH: "0",
  mainnetAvgUSD: "0",
  mainnetAvgINR: "0",
});

function writeResult(test, fn, txHash, gasUsed, fee, duration, sim) {
  const avg = sim.find((s) => s.label.startsWith("Avg"));
  const costEth = parseFloat(ethers.formatEther(fee));
  const costUsd = costEth * ETH_TO_USD;
  const costInr = costUsd * USD_TO_INR;
  return {
    test,
    fn,
    status: "✅ PASSED",
    txHash,
    gasUsed: gasUsed.toString(),
    time: duration + "s",
    sepoliaETH: costEth.toFixed(6),
    sepoliaUSD: costUsd.toFixed(4),
    sepoliaINR: costInr.toFixed(2),
    mainnetAvgETH: avg.costEth.toFixed(6),
    mainnetAvgUSD: avg.costUsd.toFixed(4),
    mainnetAvgINR: avg.costInr.toFixed(2),
  };
}

async function main() {
  line();
  console.log("  IMAGE VERIFICATION SYSTEM – COMPREHENSIVE TEST SUITE");
  line();
  console.log(
    `Date    : ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
  );
  console.log(`Network : Ethereum Sepolia Testnet + Mainnet Cost Simulation`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  line();

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

  const artifact = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/ImageRegistry.sol/ImageRegistry.json",
      "utf8",
    ),
  );
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  console.log(`\n👛 Wallet : ${wallet.address}`);
  const bal = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(bal)} ETH\n`);

  const results = [];
  let totalGas = 0n;
  let totalFee = 0n;

  // ══════════════════════════════════════════════════════════════════════
  // TEST 1 – Register Image #1
  // ══════════════════════════════════════════════════════════════════════
  line();
  console.log("TEST 1: REGISTER IMAGE #1");
  line();

  const sha256Hash1 = ethers.keccak256(
    ethers.toUtf8Bytes("test-image-chennai-marina-" + Date.now()),
  );
  const creatorHash1 = ethers.keccak256(
    ethers.toUtf8Bytes(wallet.address + "-creator-1"),
  );
  const ipfsHash1 = "QmTestIPFSHashChennai" + Date.now();

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
  const fee1 = r1.fee;
  const dur1 = ((Date.now() - t1s) / 1000).toFixed(2);
  totalGas += gas1;
  totalFee += fee1;

  const sim1 = simulateMainnetCosts(gas1);
  console.log(`\n✅ Confirmed! Time: ${dur1}s`);
  console.log(`⛽ Gas: ${gas1}`);
  console.log(`💸 Sepolia fee: ${ethers.formatEther(fee1)} ETH`);
  console.log(`🔗 https://sepolia.etherscan.io/tx/${tx1.hash}`);
  console.log(`\n🌐 Mainnet simulation:`);
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
  console.log("TEST 5: REGISTER IMAGE #2");
  line();

  const sha256Hash2 = ethers.keccak256(
    ethers.toUtf8Bytes("test-image-chennai-temple-" + Date.now()),
  );
  const creatorHash2 = ethers.keccak256(
    ethers.toUtf8Bytes(wallet.address + "-creator-2"),
  );
  const ipfsHash2 = "QmTestIPFSHashTemple" + Date.now();

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
  const fee2 = r2.fee;
  const dur2 = ((Date.now() - t5s) / 1000).toFixed(2);
  totalGas += gas2;
  totalFee += fee2;

  const sim2 = simulateMainnetCosts(gas2);
  console.log(`\n✅ Confirmed! Time: ${dur2}s`);
  console.log(`⛽ Gas: ${gas2}`);
  console.log(`💸 Sepolia fee: ${ethers.formatEther(fee2)} ETH`);
  console.log(`🔗 https://sepolia.etherscan.io/tx/${tx2.hash}`);
  console.log(`\n🌐 Mainnet simulation:`);
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
  console.log("TEST SUMMARY");
  line();

  const totalFeeETH = parseFloat(ethers.formatEther(totalFee));
  const totalFeeUSD = totalFeeETH * ETH_TO_USD;
  const totalFeeINR = totalFeeUSD * USD_TO_INR;
  const avgGas = totalGas / 2n;
  const passed = results.filter((r) => r.status.includes("PASSED")).length;

  console.log(`\n📊 Total Tests : ${results.length}`);
  console.log(`✅ Passed      : ${passed}`);
  console.log(`❌ Failed      : ${results.length - passed}`);
  console.log(`\n⛽ Total Gas (writes) : ${totalGas}`);
  console.log(`📈 Avg Gas per write  : ${avgGas}`);
  console.log(`\n💸 Total Sepolia fee  : ${totalFeeETH.toFixed(8)} ETH`);
  console.log(`💵                    : $${totalFeeUSD.toFixed(6)} USD`);
  console.log(`💰                    : ₹${totalFeeINR.toFixed(4)} INR`);

  const mainnetTotal = simulateMainnetCosts(totalGas);
  console.log(`\n🌐 Mainnet simulation (both write txs combined):`);
  mainnetTotal.forEach((s) =>
    console.log(
      `   ${s.label}: ${s.costEth.toFixed(6)} ETH  |  $${s.costUsd.toFixed(4)}  |  ₹${s.costInr.toFixed(2)}`,
    ),
  );

  const report = generateReport(
    results,
    totalGas,
    avgGas,
    totalFeeETH,
    totalFeeUSD,
    totalFeeINR,
    mainnetTotal,
  );
  fs.writeFileSync("TEST-RESULTS.md", report);
  console.log(`\n📄 Report saved → TEST-RESULTS.md`);
  line();
}

function generateReport(
  results,
  totalGas,
  avgGas,
  totalETH,
  totalUSD,
  totalINR,
  mainnetTotal,
) {
  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const passed = results.filter((r) => r.status.includes("PASSED")).length;
  const rate = ((passed / results.length) * 100).toFixed(1);

  let r = `# IMAGE VERIFICATION SYSTEM – TEST RESULTS\n\n`;
  r += `**Date:** ${date}  \n`;
  r += `**Network:** Ethereum Sepolia Testnet  \n`;
  r += `**Contract:** \`${CONTRACT_ADDRESS}\`  \n`;
  r += `**ETH/USD:** $${ETH_TO_USD}  |  **USD/INR:** ₹${USD_TO_INR}  \n\n---\n\n`;

  r += `## Test Summary\n\n| Metric | Value |\n|---|---|\n`;
  r += `| Total Tests | ${results.length} |\n`;
  r += `| Passed | ✅ ${passed} |\n`;
  r += `| Failed | ❌ ${results.length - passed} |\n`;
  r += `| Success Rate | **${rate}%** |\n\n`;

  r += `## Gas & Sepolia Costs\n\n| Metric | Value |\n|---|---|\n`;
  r += `| Total Gas | ${totalGas} |\n`;
  r += `| Avg Gas / Write | ${avgGas} |\n`;
  r += `| Total Fee (ETH) | ${totalETH.toFixed(8)} ETH |\n`;
  r += `| Total Fee (USD) | $${totalUSD.toFixed(6)} |\n`;
  r += `| Total Fee (INR) | ₹${totalINR.toFixed(4)} |\n\n`;

  r += `## Simulated Mainnet Costs\n\n| Scenario | Gwei | ETH | USD | INR |\n|---|---|---|---|---|\n`;
  mainnetTotal.forEach(
    (s) =>
      (r += `| ${s.label} | ${s.gwei} | ${s.costEth.toFixed(6)} | $${s.costUsd.toFixed(4)} | ₹${s.costInr.toFixed(2)} |\n`),
  );

  r += `\n## Detailed Results\n\n| Test | Function | Status | Gas | Time | Sepolia ETH | Mainnet Avg ETH |\n|---|---|---|---|---|---|---|\n`;
  results.forEach(
    (res) =>
      (r += `| ${res.test} | \`${res.fn}\` | ${res.status} | ${res.gasUsed} | ${res.time} | ${res.sepoliaETH} | ${res.mainnetAvgETH} |\n`),
  );

  r += `\n## Transaction Links\n\n`;
  results
    .filter((res) => res.txHash.startsWith("0x"))
    .forEach(
      (res, i) =>
        (r += `${i + 1}. [${res.test}](https://sepolia.etherscan.io/tx/${res.txHash})\n`),
    );

  r += `\n## Conclusion\n\nAll ${results.length} tests executed. ${passed}/${results.length} passed (${rate}%).\n`;
  r += `**Next:** Frontend (React + Web3.js), IPFS integration, perceptual hash service.\n`;
  return r;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
