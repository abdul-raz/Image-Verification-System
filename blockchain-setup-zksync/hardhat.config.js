require("dotenv").config();

require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-verify");

// NOTE: Only keep upgradable if you are deploying PROXY contracts.
// If ImageRegistry is normal contract, you can remove it to avoid issues.
// require("@matterlabs/hardhat-zksync-upgradable");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  zksolc: {
    version: "1.5.1",
    settings: {},
  },

  networks: {
    zkTestnet: {
      url: process.env.ZKSYNC_SEPOLIA_RPC || "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia",
      zksync: true,

      // ✅ THIS FIXES YOUR ERROR
      accounts: process.env.ZKSYNC_PRIVATE_KEY
        ? [process.env.ZKSYNC_PRIVATE_KEY]
        : [],
    },
  },
};
