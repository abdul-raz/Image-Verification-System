module.exports = async (hre) => {
  console.log("=".repeat(70));
  console.log("DEPLOYING ImageRegistry TO ZKSYNC SEPOLIA");
  console.log("=".repeat(70));

  const deployer = await hre.deployer;

  const imageRegistryArtifact = await deployer.loadArtifact("ImageRegistry");

  const imageRegistry = await deployer.deploy(imageRegistryArtifact, []);

  const address = await imageRegistry.getAddress();

  console.log("\n✅ ImageRegistry deployed to:", address);
  console.log(
    "Explorer:",
    `https://sepolia.explorer.zksync.io/address/${address}`,
  );
  console.log("=".repeat(70));
};
