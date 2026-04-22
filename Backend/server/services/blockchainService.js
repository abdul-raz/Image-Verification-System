// services/blockchainService.js
// Supports L1 Ethereum Sepolia + L2 zkSync Era Sepolia
// Controlled by REGISTER_ON_NETWORK env var: "L1" | "L2" | "BOTH"

const { ethers } = require("ethers");
const { Provider: ZkProvider, Wallet: ZkWallet } = require("zksync-ethers");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────────────────────
//  LOAD ABIs
// ─────────────────────────────────────────────────────────────────────────────

const L1_ABI_PATH = path.resolve(
  __dirname,
  "../../../blockchain-setup/artifacts/contracts/ImageRegistry.sol/ImageRegistry.json",
);

const L2_ABI_PATH = path.resolve(
  __dirname,
  "../../../blockchain-setup-zksync/deployments-zk/zkSyncSepolia/contracts/ImageRegistry.sol/ImageRegistry.json",
);

function loadABI(abiPath, label) {
  try {
    const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    console.log(`[blockchainService] ✅ ${label} ABI loaded`);
    return artifact.abi;
  } catch (err) {
    console.error(
      `[blockchainService] ❌ Could not load ${label} ABI from: ${abiPath}`,
    );
    throw err;
  }
}

const L1_ABI = loadABI(L1_ABI_PATH, "L1");
const L2_ABI = loadABI(L2_ABI_PATH, "L2");

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toBytes32(hexString) {
  const clean = hexString.replace(/^0x/i, "");
  if (clean.length !== 64) {
    throw new Error(
      `toBytes32: expected 64 hex chars, got ${clean.length}. Value: ${hexString.slice(0, 20)}...`,
    );
  }
  return "0x" + clean;
}

function getL1Wallet() {
  const rpcUrl = process.env.L1_RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (!rpcUrl) throw new Error("L1_RPC_URL is missing from .env");
  if (!privateKey) throw new Error("WALLET_PRIVATE_KEY is missing from .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

function getL2Wallet() {
  const l2RpcUrl = process.env.L2_RPC_URL;
  const l1RpcUrl = process.env.L1_RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (!l2RpcUrl) throw new Error("L2_RPC_URL is missing from .env");
  if (!privateKey) throw new Error("WALLET_PRIVATE_KEY is missing from .env");

  const l2Provider = new ZkProvider(l2RpcUrl);
  const l1Provider = l1RpcUrl
    ? new ethers.JsonRpcProvider(l1RpcUrl)
    : undefined;

  return new ZkWallet(privateKey, l2Provider, l1Provider);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE CONTRACT CALLER
// ─────────────────────────────────────────────────────────────────────────────

async function _callContract(
  wallet,
  contractAddress,
  abi,
  sha256Hash,
  creatorHash,
  ipfsHash,
  title,
  description,
) {
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const sha256Bytes32 = toBytes32(sha256Hash);
  const creatorBytes32 = toBytes32(creatorHash);

  console.log(`[blockchainService] Sending tx to ${contractAddress}...`);

  const tx = await contract.registerImage(
    sha256Bytes32,
    creatorBytes32,
    ipfsHash,
    title,
    description,
  );

  console.log(
    `[blockchainService] Tx sent: ${tx.hash} — waiting for confirmation...`,
  );

  const receipt = await tx.wait(1);

  console.log(
    `[blockchainService] ✅ Confirmed in block ${receipt.blockNumber}`,
  );

  return {
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: Number(receipt.gasUsed),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  L1 REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

async function _registerL1(
  sha256Hash,
  creatorHash,
  ipfsHash,
  title,
  description,
) {
  const contractAddress = process.env.L1_CONTRACT_ADDRESS;
  if (!contractAddress)
    throw new Error("L1_CONTRACT_ADDRESS is missing from .env");

  const wallet = getL1Wallet();
  const result = await _callContract(
    wallet,
    contractAddress,
    L1_ABI,
    sha256Hash,
    creatorHash,
    ipfsHash,
    title,
    description,
  );

  return {
    success: true,
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    gasUsed: result.gasUsed,
    network: "ethereum-sepolia",
    explorerUrl: `https://sepolia.etherscan.io/tx/${result.txHash}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  L2 REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

async function _registerL2(
  sha256Hash,
  creatorHash,
  ipfsHash,
  title,
  description,
) {
  const contractAddress = process.env.L2_CONTRACT_ADDRESS;
  if (!contractAddress)
    throw new Error("L2_CONTRACT_ADDRESS is missing from .env");

  const wallet = getL2Wallet();
  const result = await _callContract(
    wallet,
    contractAddress,
    L2_ABI,
    sha256Hash,
    creatorHash,
    ipfsHash,
    title,
    description,
  );

  return {
    success: true,
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    gasUsed: result.gasUsed,
    network: "zksync-sepolia",
    explorerUrl: `https://sepolia.explorer.zksync.io/tx/${result.txHash}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

async function registerOnBlockchain(
  sha256Hash,
  creatorHash,
  ipfsHash,
  title,
  description,
  networkOverride = null,
) {
  const network = (networkOverride || process.env.REGISTER_ON_NETWORK || "L1").toUpperCase();

  try {
    if (network === "L1") {
      console.log("[blockchainService] Registering on L1 Ethereum Sepolia...");
      return await _registerL1(
        sha256Hash,
        creatorHash,
        ipfsHash,
        title,
        description,
      );
    }

    if (network === "L2") {
      console.log("[blockchainService] Registering on L2 zkSync Sepolia...");
      return await _registerL2(
        sha256Hash,
        creatorHash,
        ipfsHash,
        title,
        description,
      );
    }

    if (network === "BOTH") {
      console.log("[blockchainService] Registering on BOTH L1 + L2...");
      const [l1, l2] = await Promise.all([
        _registerL1(sha256Hash, creatorHash, ipfsHash, title, description),
        _registerL2(sha256Hash, creatorHash, ipfsHash, title, description),
      ]);

      return {
        success: true,
        txHash: l2.txHash,
        blockNumber: l2.blockNumber,
        gasUsed: l2.gasUsed,
        network: "both",
        explorerUrl: l2.explorerUrl,
        l1TxHash: l1.txHash,
        l1ExplorerUrl: l1.explorerUrl,
        l2TxHash: l2.txHash,
        l2ExplorerUrl: l2.explorerUrl,
      };
    }

    throw new Error(
      `Unknown REGISTER_ON_NETWORK value: "${network}". Use L1, L2, or BOTH`,
    );
  } catch (err) {
    console.error("[blockchainService] ❌ Registration failed:", err.message);
    return {
      success: false,
      error: err.message,
      network: network.toLowerCase(),
    };
  }
}

module.exports = { registerOnBlockchain };
