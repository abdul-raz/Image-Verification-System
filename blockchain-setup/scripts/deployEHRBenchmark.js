import { ethers as ethersLib } from "ethers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("🚀 Starting EHRBenchmark deployment...");

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL not found in .env file");
  }

  if (!privateKey) {
    throw new Error("SEPOLIA_PRIVATE_KEY not found in .env file");
  }

  if (!privateKey.startsWith("0x")) {
    throw new Error("SEPOLIA_PRIVATE_KEY must start with 0x");
  }

  console.log("RPC URL: ✓ Loaded");
  console.log("Private Key: ✓ Loaded");

  // Provider + Wallet
  const provider = new ethersLib.JsonRpcProvider(rpcUrl);
  const wallet = new ethersLib.Wallet(privateKey, provider);

  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethersLib.formatEther(balance), "ETH");

  // Load compiled contract artifact
  const hre = await import("hardhat");
  const artifact = await hre.default.artifacts.readArtifact("EHRBenchmark");

  // Create contract factory
  const factory = new ethersLib.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet,
  );

  console.log("\n📦 Deploying EHRBenchmark...");

  const contract = await factory.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("\n✅ EHRBenchmark Deployed to:", address);
  console.log("🔎 View on Etherscan:");
  console.log("https://sepolia.etherscan.io/address/" + address);

  return address;
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
});
