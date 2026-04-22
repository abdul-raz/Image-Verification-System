
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ImageRegistry Contract", function () {
  let imageRegistry;
  let owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const ImageRegistry = await ethers.getContractFactory("ImageRegistry");
    imageRegistry = await ImageRegistry.deploy();
    await imageRegistry.waitForDeployment();
  });

  describe("Image Registration", function () {
    it("Should register a new image successfully", async function () {
      const imageId = 1;
      const timestamp = Math.floor(Date.now() / 1000);
      const title = "Chennai Marina Beach";
      const description = "Beautiful sunset at Marina Beach";
      const imageHash = "QmTestHashABC123456789";

      await imageRegistry.registerImage(
        imageId,
        timestamp,
        title,
        description,
        imageHash
      );

      const image = await imageRegistry.getImage(imageId);
      expect(image.id).to.equal(imageId);
      expect(image.title).to.equal(title);
      expect(image.description).to.equal(description);
      expect(image.imageHash).to.equal(imageHash);
      expect(image.isRevoked).to.be.false;
    });

    it("Should emit ImageRegistered event", async function () {
      const imageId = 2;
      const timestamp = Math.floor(Date.now() / 1000);

      await expect(
        imageRegistry.registerImage(
          imageId,
          timestamp,
          "Event Test Image",
          "Testing event emission",
          "QmEventHash123"
        )
      ).to.emit(imageRegistry, "ImageRegistered").withArgs(imageId, owner.address);
    });
  });

  describe("Image Verification", function () {
    it("Should verify that registered image exists", async function () {
      const imageId = 100;
      await imageRegistry.registerImage(
        imageId,
        Math.floor(Date.now() / 1000),
        "Verification Test",
        "Testing verification function",
        "QmVerifyHash"
      );

      const verification = await imageRegistry.verifyImage(imageId);
      expect(verification.exists).to.be.true;
      expect(verification.isRevoked).to.be.false;
      expect(verification.registrationTime).to.be.greaterThan(0);
    });

    it("Should return false for non-existent image", async function () {
      const verification = await imageRegistry.verifyImage(999999);
      expect(verification.exists).to.be.false;
      expect(verification.registrationTime).to.equal(0);
    });
  });

  describe("Image Revocation", function () {
    it("Should revoke an image successfully", async function () {
      const imageId = 50;

      await imageRegistry.registerImage(
        imageId,
        Math.floor(Date.now() / 1000),
        "Revoke Test",
        "Will be revoked",
        "QmRevokeHash"
      );

      await imageRegistry.revokeImage(imageId);

      const verification = await imageRegistry.verifyImage(imageId);
      expect(verification.exists).to.be.true;
      expect(verification.isRevoked).to.be.true;
    });

    it("Should emit ImageRevoked event", async function () {
      const imageId = 51;

      await imageRegistry.registerImage(
        imageId,
        Math.floor(Date.now() / 1000),
        "Event Revoke Test",
        "Testing revoke event",
        "QmRevokeEventHash"
      );

      await expect(imageRegistry.revokeImage(imageId))
        .to.emit(imageRegistry, "ImageRevoked")
        .withArgs(imageId, owner.address);
    });
  });
});