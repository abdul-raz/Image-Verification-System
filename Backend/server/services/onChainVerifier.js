// services/onChainVerifier.js
// L1 → Etherscan Sepolia REST API
// L2 → zkSync Provider getTransactionReceipt (direct RPC)

const axios = require("axios");
const { Provider: ZkProvider } = require("zksync-ethers");

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — parse blockNumber (hex or decimal)
// ─────────────────────────────────────────────────────────────────────────────

function parseBlockNumber(raw) {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  const s = String(raw);
  return s.startsWith("0x") ? parseInt(s, 16) : parseInt(s, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
//  L1 — Etherscan Sepolia via REST API
// ─────────────────────────────────────────────────────────────────────────────

async function verifyOnEtherscanSepolia(txHash) {
  const apiKey = process.env.ETHERSCAN_SEPOLIA_API_KEY;
  const contractAddress = process.env.L1_CONTRACT_ADDRESS;

  if (!apiKey) {
    console.warn(
      "[OnChainVerifier] WARNING: ETHERSCAN_SEPOLIA_API_KEY not set",
    );
    return { verified: false, reason: "Etherscan API key not configured" };
  }

  // eth_getTransactionReceipt — only exists after mining
  const receiptUrl =
    "https://api-sepolia.etherscan.io/api" +
    "?module=proxy" +
    "&action=eth_getTransactionReceipt" +
    "&txhash=" +
    txHash +
    "&apikey=" +
    apiKey;

  const { data } = await axios.get(receiptUrl, { timeout: 12000 });

  if (!data || !data.result) {
    // Fallback: distinguish pending vs not found
    const txUrl =
      "https://api-sepolia.etherscan.io/api" +
      "?module=proxy" +
      "&action=eth_getTransactionByHash" +
      "&txhash=" +
      txHash +
      "&apikey=" +
      apiKey;

    const txData = await axios.get(txUrl, { timeout: 12000 });

    if (!txData.data || !txData.data.result) {
      return {
        verified: false,
        reason: "Transaction not found on Ethereum Sepolia",
      };
    }
    return {
      verified: false,
      reason: "Transaction is pending — please retry in ~30 seconds",
    };
  }

  const receipt = data.result;

  if (receipt.status === "0x0") {
    return {
      verified: false,
      reason: "Transaction was reverted on-chain (status: failed)",
    };
  }

  if (
    contractAddress &&
    receipt.to &&
    receipt.to.toLowerCase() !== contractAddress.toLowerCase()
  ) {
    return {
      verified: false,
      reason: "Transaction target does not match registered contract",
    };
  }

  return {
    verified: true,
    network: "ethereum-sepolia",
    blockNumber: parseBlockNumber(receipt.blockNumber),
    from: receipt.from,
    to: receipt.to,
    status: "success",
    explorerUrl: "https://sepolia.etherscan.io/tx/" + txHash,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  L2 — zkSync Era Sepolia via direct RPC provider
//  No Etherscan needed — zkSync provider getTransactionReceipt works directly
// ─────────────────────────────────────────────────────────────────────────────

async function verifyOnZkSyncSepolia(txHash) {
  const contractAddress = process.env.L2_CONTRACT_ADDRESS;
  const rpcUrl = process.env.L2_RPC_URL || "https://sepolia.era.zksync.dev";

  const provider = new ZkProvider(rpcUrl);

  // getTransactionReceipt returns null if pending or not found
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    // Check if tx exists at all
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return {
        verified: false,
        reason: "Transaction not found on zkSync Era Sepolia",
      };
    }
    return {
      verified: false,
      reason: "Transaction is pending on zkSync — retry in ~15 seconds",
    };
  }

  // status 0 = reverted, 1 = success
  if (receipt.status === 0) {
    return {
      verified: false,
      reason: "Transaction was reverted on zkSync (status: failed)",
    };
  }

  if (
    contractAddress &&
    receipt.to &&
    receipt.to.toLowerCase() !== contractAddress.toLowerCase()
  ) {
    return {
      verified: false,
      reason: "Transaction target does not match registered L2 contract",
    };
  }

  return {
    verified: true,
    network: "zksync-sepolia",
    blockNumber: Number(receipt.blockNumber),
    from: receipt.from,
    to: receipt.to,
    status: "success",
    explorerUrl: "https://sepolia.explorer.zksync.io/tx/" + txHash,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN ENTRY POINT — smart dispatcher based on stored network
// ─────────────────────────────────────────────────────────────────────────────

async function verifyTxOnChain(txHash, network) {
  // Guard: missing txHash
  if (!txHash) {
    return { verified: false, reason: "No txHash stored for this image" };
  }

  // Guard: legacy/dummy records
  if (
    txHash.startsWith("0x0x") ||
    txHash === "simulated" ||
    txHash.length < 60
  ) {
    return {
      verified: false,
      reason: "Legacy record — registered before real blockchain integration",
    };
  }

  if (network === "legacy-dummy") {
    return {
      verified: false,
      reason: "Legacy record — registered with dummy blockchain service",
    };
  }

  console.log(
    "[OnChainVerifier] Checking txHash " +
      txHash.slice(0, 20) +
      "... on " +
      (network || "ethereum-sepolia"),
  );

  try {
    let result;

    if (network === "zksync-sepolia") {
      result = await verifyOnZkSyncSepolia(txHash);
    } else if (network === "ethereum-sepolia" || !network) {
      result = await verifyOnEtherscanSepolia(txHash);
    } else if (network === "both") {
      // BOTH: try L2 first, fall back to L1
      result = await verifyOnZkSyncSepolia(txHash);
      if (!result.verified) {
        result = await verifyOnEtherscanSepolia(txHash);
      }
    } else {
      result = await verifyOnEtherscanSepolia(txHash);
    }

    if (result.verified) {
      console.log(
        "[OnChainVerifier] ✅ Verified on-chain — block " + result.blockNumber,
      );
    } else {
      console.log("[OnChainVerifier] ⚠️  Not verified — " + result.reason);
    }

    return result;
  } catch (err) {
    console.error("[OnChainVerifier] ❌ Error:", err.message);
    return {
      verified: false,
      reason: "Explorer unreachable: " + err.message,
    };
  }
}

module.exports = { verifyTxOnChain };