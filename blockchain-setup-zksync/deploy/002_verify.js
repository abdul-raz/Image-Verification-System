module.exports.tags = ["verify"];

module.exports = async (hre) => {
  console.log("🔍 Verifying ImageRegistry...");

  const imageRegistry = await hre.deployer.loadArtifact("ImageRegistry");

  await hre.run("verify:verify", {
    address: "0x823dCF4a7B963aD6F4EB7F93eC8045f91E198B8E",
    constructorArguments: [],
  });

  console.log("✅ Verification complete!");
};
