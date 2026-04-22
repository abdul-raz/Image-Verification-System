import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ImageRegistryModule", (m) => {
  const imageRegistry = m.contract("ImageRegistry");
  return { imageRegistry };
});
