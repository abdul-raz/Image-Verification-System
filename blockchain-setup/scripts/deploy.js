import { ethers as ethersLib } from "ethers";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  console.log("Starting deployment...");

  // Read directly from environment variables
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

  // Validate environment variables
  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL not found in .env file");
  }
  if (!privateKey) {
    throw new Error("SEPOLIA_PRIVATE_KEY not found in .env file");
  }
  if (!privateKey.startsWith("0x")) {
    throw new Error("SEPOLIA_PRIVATE_KEY must start with 0x");
  }

  console.log("RPC URL:", rpcUrl);
  console.log("Private Key: ✓ Found");

  // Create provider and wallet
  const provider = new ethersLib.JsonRpcProvider(rpcUrl);
  const wallet = new ethersLib.Wallet(privateKey, provider);

  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethersLib.formatEther(balance), "ETH");

  // Load compiled contract
  const hre = await import("hardhat");
  const artifact = await hre.default.artifacts.readArtifact("ImageRegistry");

  // Create contract factory
  const factory = new ethersLib.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet,
  );

  console.log("\nDeploying ImageRegistry...");
  const imageRegistry = await factory.deploy();

  await imageRegistry.waitForDeployment();

  const address = await imageRegistry.getAddress();
  console.log("\n✅ Deployed to:", address);
  console.log("View: https://sepolia.etherscan.io/address/" + address);

  return address;
}

main().catch(console.error);
