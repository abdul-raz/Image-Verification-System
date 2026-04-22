const express = require("express");
const router = express.Router();
const fs = require("fs");
const upload = require("../middleware/upload");
const { validateAndNormalize } = require("../services/imageService");
const { computeHashes } = require("../services/hashService");
const { createPrivacyRecord } = require("../services/privacyService");
const { uploadToPinata } = require("../services/ipfsService");
const { registerOnBlockchain } = require("../services/blockchainService");
const { saveRegistration } = require("../services/databaseService");

// ─────────────────────────────────────────────────────────────────────────────
//  INPUT VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(value, maxLength = 500) {
  if (!value || typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /register
// ─────────────────────────────────────────────────────────────────────────────

router.post("/register", upload.single("image"), async (req, res) => {
  try {
    // ── 1. File Check ────────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // ── 2. Input Validation & Sanitization ───────────────────────────────────
    const { email } = req.body;
    const title = sanitizeText(req.body.title, 200) || "Untitled";
    const description = sanitizeText(req.body.description, 1000) || "";
    const network = ["L1", "L2"].includes(
      (req.body.network || "").toUpperCase(),
    )
      ? req.body.network.toUpperCase()
      : null; // null → blockchainService uses .env default
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Valid email address is required",
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // ── 3. Validate & Normalize Image ────────────────────────────────────────
    console.log("[Register] Step 1: Validating and normalizing image...");
    const validationResult = await validateAndNormalize(req.file.buffer);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    console.log("[Register] ✅ Image validated");
    console.log(`[Register]    Hashing:  normalizedBuffer (512×512 PNG)`);
    console.log(
      `[Register]    IPFS:     originalBuffer (${validationResult.originalDimensions.width}×${validationResult.originalDimensions.height} ${validationResult.originalFormat.toUpperCase()})`,
    );

    // ── 4. Compute All Hashes using NORMALIZED buffer ─────────────────────────
    // Paper requires 512×512 normalization for consistent hash comparison
    console.log("[Register] Step 2: Computing hashes...");
    const hashResult = await computeHashes(validationResult.normalizedBuffer);
    if (!hashResult.success) {
      return res.status(400).json({
        error: "Hash computation failed: " + hashResult.error,
      });
    }

    console.log("[Register] SHA256:", hashResult.sha256);
    console.log("[Register] pHash:", hashResult.pHash);
    console.log("[Register] dHash:", hashResult.dHash);
    console.log("[Register] aHash:", hashResult.aHash);
    console.log("[Register] wHash:", hashResult.wHash);
    console.log("[Register] cropHash:", hashResult.cropHash);
    console.log("[Register] ✅ All 6 hashes computed");

    if (!hashResult.sha256 || !hashResult.pHash) {
      return res.status(400).json({
        error: "Critical hash fields missing — check compute_hashes.py output",
      });
    }

    // ── 5. Create Privacy Record ─────────────────────────────────────────────
    console.log("[Register] Step 3: Creating privacy record...");
    const privacyResult = await createPrivacyRecord(sanitizedEmail);
    if (!privacyResult.success) {
      return res.status(400).json({
        error: "Privacy record creation failed: " + privacyResult.error,
      });
    }
    console.log("[Register] ✅ Privacy record created");

    // ── 6. Upload ORIGINAL image to IPFS (full resolution, no crop) ──────────
    console.log("[Register] Step 4: Uploading original image to IPFS...");
    const ipfsResult = await uploadToPinata(
      validationResult.originalBuffer, // ← ORIGINAL, not normalized
      title,
      description,
    );
    if (!ipfsResult.success) {
      return res.status(502).json({
        error: "IPFS upload failed: " + ipfsResult.error,
      });
    }
    console.log("[Register] ✅ Uploaded to IPFS:", ipfsResult.ipfsHash);

    // ── 7. Register on Blockchain (Real L1 Ethereum Sepolia) ─────────────────
    console.log("[Register] Step 5: Registering on blockchain...");
    const blockchainResult = await registerOnBlockchain(
      hashResult.sha256,
      privacyResult.creatorHash,
      ipfsResult.ipfsHash,
      title,
      description,
      network, // ← optional override from request body
    );
    if (!blockchainResult.success) {
      return res.status(502).json({
        error: "Blockchain registration failed: " + blockchainResult.error,
      });
    }
    console.log("[Register] ✅ Blockchain TX:", blockchainResult.txHash);
    console.log("[Register] 🔗 Explorer:", blockchainResult.explorerUrl);

    // ── 8. Save to Database ──────────────────────────────────────────────────
    console.log("[Register] Step 6: Saving to database...");
    const dbResult = await saveRegistration({
      sha256: hashResult.sha256,
      pHash: hashResult.pHash,
      dHash: hashResult.dHash || null,
      aHash: hashResult.aHash || null,
      wHash: hashResult.wHash || null,
      cropHash: hashResult.cropHash || null,
      creatorHash: privacyResult.creatorHash,
      secretCodeHash: privacyResult.secretCodeHash,
      ipfsHash: ipfsResult.ipfsHash,
      txHash: blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber,
      network: blockchainResult.network,
      title,
      description,
    });

    if (!dbResult.success) {
      if (
        dbResult.error &&
        dbResult.error.toLowerCase().includes("duplicate")
      ) {
        return res.status(409).json({
          error: "This image is already registered.",
          hint: "Use /api/verify to check its existing registration details.",
        });
      }
      return res.status(500).json({
        error: "Database save failed: " + dbResult.error,
      });
    }
    console.log("[Register] ✅ Saved to database, image ID:", dbResult.imageId);

    // ── 9. Cleanup Temp File ─────────────────────────────────────────────────
    try {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn("[Register] Could not delete temp file:", e.message);
    }

    // ── 10. Success Response ─────────────────────────────────────────────────
    return res.status(201).json({
      status: "Image registered successfully with privacy protection",
      imageId: dbResult.imageId,

      hashes: {
        sha256: hashResult.sha256,
        pHash: hashResult.pHash,
        dHash: hashResult.dHash || null,
        aHash: hashResult.aHash || null,
        wHash: hashResult.wHash || null,
        cropHash: hashResult.cropHash || null,
      },

      privacy: {
        secretCode: privacyResult.secretCode, // ⚠️ Shown ONCE — user must save this
        secretCodeHash: privacyResult.secretCodeHash,
        creatorHash: privacyResult.creatorHash,
      },

      metadata: {
        title,
        description,
        originalDimensions: validationResult.originalDimensions,
        originalFormat: validationResult.originalFormat,
      },

      ipfs: {
        hash: ipfsResult.ipfsHash,
        pinId: ipfsResult.pinId || null,
        url: `https://gateway.pinata.cloud/ipfs/${ipfsResult.ipfsHash}`,
      },

      blockchain: {
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
        network: blockchainResult.network,
        explorerUrl: blockchainResult.explorerUrl,
      },
    });
  } catch (error) {
    console.error("[Register] ❌ Unexpected error:", error);
    return res.status(500).json({
      error: "Registration failed: " + error.message,
    });
  }
});

module.exports = router;
