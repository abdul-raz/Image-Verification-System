import { ethers as ethersLib } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const CONTRACT_ADDRESS = "0xF49789251B9444a29A9EA203FEd06E54A149da01";

// Update ETH price manually if needed
const ETH_TO_USD = 1958;
const USD_TO_INR = 83.5;

// Historical Gas Scenarios (Mainnet)
const GAS_SCENARIOS = [
  { label: "Very Low (Bear Market)", gwei: 5 },
  { label: "Average Activity", gwei: 20 },
  { label: "Busy Network", gwei: 50 },
  { label: "High Congestion / NFT Mania", gwei: 100 },
];

async function main() {
  console.log("=".repeat(75));
  console.log("   EHR BENCHMARK + MAINNET COST PREDICTION");
  console.log("=".repeat(75));

  const provider = new ethersLib.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

  const patientWallet = new ethersLib.Wallet(
    process.env.SEPOLIA_PRIVATE_KEY,
    provider,
  );

  const doctorWallet = new ethersLib.Wallet(
    process.env.SEPOLIA_DOCTOR_PRIVATE_KEY,
    provider,
  );

  const artifact = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/EHRBenchmark.sol/EHRBenchmark.json",
      "utf8",
    ),
  );

  const patientContract = new ethersLib.Contract(
    CONTRACT_ADDRESS,
    artifact.abi,
    patientWallet,
  );

  const doctorContract = new ethersLib.Contract(
    CONTRACT_ADDRESS,
    artifact.abi,
    doctorWallet,
  );

  let totalGas = 0n;
  let totalCostETH = 0n;
  const results = [];

  function recordGas(receipt, testName, txHash) {
    const gas = receipt.gasUsed;
    const gasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice;
    const cost = gas * gasPrice;

    totalGas += gas;
    totalCostETH += cost;

    console.log(`${testName} Gas Used:`, gas.toString());

    results.push({
      test: testName,
      gas: gas.toString(),
      tx: txHash,
    });
  }

  async function ensureRegistered(contract, wallet, role, label) {
    const user = await contract.users(wallet.address);

    if (!user.registered) {
      console.log(`Registering ${label}...`);
      const tx = await contract.register(role);
      const receipt = await tx.wait();
      recordGas(receipt, `Register ${label}`, tx.hash);
    } else {
      console.log(`${label} already registered.`);
    }
  }

  console.log("\n=== REGISTRATION CHECK ===");
  await ensureRegistered(patientContract, patientWallet, 1, "Patient");
  await ensureRegistered(doctorContract, doctorWallet, 2, "Doctor");

  // Upload
  console.log("\nTEST: Upload EHR");

  const ipfsHash = "QmEHRTest" + Date.now();
  const dataHash = ethersLib.keccak256(
    ethersLib.toUtf8Bytes("ehr-data-" + Date.now()),
  );

  const txUpload = await doctorContract.uploadPatientData(
    patientWallet.address,
    ipfsHash,
    dataHash,
  );

  const uploadReceipt = await txUpload.wait();
  recordGas(uploadReceipt, "Upload EHR", txUpload.hash);

  const uploadGasUsed = uploadReceipt.gasUsed;

  // Grant Access
  console.log("\nTEST: Grant Access");

  const txGrant = await patientContract.grantAccess(doctorWallet.address);
  const grantReceipt = await txGrant.wait();
  recordGas(grantReceipt, "Grant Access", txGrant.hash);

  // Read operations
  const count = await doctorContract.getRecordCount(patientWallet.address);
  console.log("Record Count:", count.toString());

  const records = await doctorContract.retrievePatientData(
    patientWallet.address,
  );

  console.log("Records Found:", records.length);

  // Summary
  const totalETH = parseFloat(ethersLib.formatEther(totalCostETH));
  const totalUSD = totalETH * ETH_TO_USD;
  const totalINR = totalUSD * USD_TO_INR;

  console.log("\n" + "=".repeat(75));
  console.log("SEPOLIA COST SUMMARY");
  console.log("=".repeat(75));

  console.log("Total Gas Used:", totalGas.toString());
  console.log("Total Cost (ETH):", totalETH.toFixed(8));
  console.log("Total Cost (USD): $", totalUSD.toFixed(4));
  console.log("Total Cost (INR): ₹", totalINR.toFixed(2));

  // Mainnet Projection
  console.log("\n" + "=".repeat(75));
  console.log("MAINNET COST PREDICTION (HISTORICAL GAS BANDS)");
  console.log("=".repeat(75));

  GAS_SCENARIOS.forEach((scenario) => {
    const costETH = Number(uploadGasUsed) * scenario.gwei * 1e-9;

    const costUSD = costETH * ETH_TO_USD;
    const costINR = costUSD * USD_TO_INR;

    console.log(
      `${scenario.label} (${scenario.gwei} gwei) → ₹${costINR.toFixed(
        2,
      )} (~$${costUSD.toFixed(2)})`,
    );
  });

  generateReport(totalGas, totalETH, totalUSD, totalINR, uploadGasUsed);
}

function generateReport(totalGas, totalETH, totalUSD, totalINR, uploadGasUsed) {
  let report = `# EHR Benchmark + Mainnet Projection Report\n\n`;

  report += `## Sepolia Results\n`;
  report += `- Total Gas Used: ${totalGas.toString()}\n`;
  report += `- Total ETH: ${totalETH.toFixed(8)}\n`;
  report += `- Total USD: $${totalUSD.toFixed(4)}\n`;
  report += `- Total INR: ₹${totalINR.toFixed(2)}\n\n`;

  report += `## Mainnet Cost Projection (Upload Only)\n`;

  const scenarios = [
    { label: "Very Low (5 gwei)", gwei: 5 },
    { label: "Average (20 gwei)", gwei: 20 },
    { label: "Busy (50 gwei)", gwei: 50 },
    { label: "High Congestion (100 gwei)", gwei: 100 },
  ];

  scenarios.forEach((s) => {
    const costETH = Number(uploadGasUsed) * s.gwei * 1e-9;
    const costUSD = costETH * 1958;
    const costINR = costUSD * 83.5;

    report += `- ${s.label} → ₹${costINR.toFixed(2)}\n`;
  });

  fs.writeFileSync("EHR-PROJECTION-REPORT.md", report);
  console.log("\n📄 Report Generated: EHR-PROJECTION-REPORT.md");
}

main().catch(console.error);
