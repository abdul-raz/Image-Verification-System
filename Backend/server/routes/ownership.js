const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const upload = require("../middleware/upload");
const { validateAndNormalize } = require("../services/imageService");
const {
  getImageBySecretCode,
  getImageById,
} = require("../services/databaseService");
const { hashSecretCode } = require("../services/privacyService");
const { verifyTxOnChain } = require("../services/onChainVerifier"); // ← NEW

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function hammingDistance(hex1, hex2) {
  if (!hex1 || !hex2) return Infinity;
  const len = Math.min(hex1.length, hex2.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    let xor = parseInt(hex1[i], 16) ^ parseInt(hex2[i], 16);
    while (xor) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  dist += Math.abs(hex1.length - hex2.length) * 2;
  return dist;
}

async function computeHashesPython(imagePath) {
  const scriptPath = path.join(__dirname, "../../python/compute_hashes.py");
  const { stdout, stderr } = await execFileAsync(
    "python",
    [scriptPath, imagePath],
    { timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  if (stderr && stderr.trim()) {
    console.warn("[Python stderr]:", stderr.trim());
  }
  return JSON.parse(stdout);
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMAGE MATCH CHECK
//  Priority 1 — SHA-256 exact
//  Priority 2 — Perceptual consensus (3 of 4 perceptual hashes agree)
// ─────────────────────────────────────────────────────────────────────────────

function imageMatchesRegistered(registered, suspect) {
  // ONLY allow exact cryptographic match to prove ownership
  if (registered.imagehash === suspect.sha256) {
    console.log("[Ownership] ✅ SHA-256 exact match");
    return { matched: true, method: "sha256-exact", confidence: 1.0 };
  }

  // If SHA-256 fails, reject it completely.
  // We do not allow perceptual matches for proving ownership.
  console.log("[Ownership] ❌ SHA-256 mismatch. Exact original file required.");
  return { matched: false, method: "no-match", confidence: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /prove-ownership
//  Body (multipart/form-data):
//    image
//    secretCode
// ─────────────────────────────────────────────────────────────────────────────

router.post("/prove-ownership", upload.single("image"), async (req, res) => {
  let tempImagePath = null;

  try {
    // ── 1. Input Validation ──────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const { secretCode } = req.body;
    if (!secretCode || secretCode.trim() === "") {
      return res.status(400).json({ error: "secretCode is required" });
    }

    console.log("[Ownership] Step 1: Inputs received");

    // ── 2. Hash Secret Code ──────────────────────────────────────────────────
    const secretCodeHash = hashSecretCode(secretCode);
    console.log(
      "[Ownership] Step 2: secretCodeHash:",
      secretCodeHash.substring(0, 16) + "...",
    );

    // ── 3. Look Up Secret Code in DB ─────────────────────────────────────────
    console.log("[Ownership] Step 3: Looking up secret code in DB...");
    const registeredImage = await getImageBySecretCode(secretCodeHash);

    if (!registeredImage) {
      console.log("[Ownership] ❌ Secret code not found or expired");
      return res.status(404).json({
        verified: false,
        error: "Invalid or expired secret code.",
        message: "No registered image found for this secret code.",
      });
    }

    console.log(
      `[Ownership] ✅ Secret code matched imageId: ${registeredImage.id}`,
    );

    // ── 4. Normalize Uploaded Image ──────────────────────────────────────────
    console.log("[Ownership] Step 4: Normalizing image...");
    const validationResult = await validateAndNormalize(req.file.buffer);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    console.log("[Ownership] ✅ Image normalized");

    // ── 5. Write Temp File for Python ────────────────────────────────────────
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    tempImagePath = path.join(
      uploadsDir,
      `ownership_${Date.now()}_${Math.random().toString(36).slice(2)}.png`,
    );
    fs.writeFileSync(tempImagePath, validationResult.normalizedBuffer);

    // ── 6. Compute Hashes ────────────────────────────────────────────────────
    console.log("[Ownership] Step 5: Computing hashes...");
    let suspectHashes;
    try {
      suspectHashes = await computeHashesPython(tempImagePath);
    } catch (pyError) {
      return res.status(400).json({
        error: "Hash computation failed: " + pyError.message,
      });
    }

    if (!suspectHashes || !suspectHashes.sha256) {
      return res.status(400).json({
        error: "Python returned invalid hash output",
      });
    }

    console.log("[Ownership] ✅ Hashes computed");
    console.log(
      "[Ownership] SHA256:",
      suspectHashes.sha256.substring(0, 16) + "...",
    );

    // ── 7. Match Image Against Registered Record ─────────────────────────────
    console.log(
      "[Ownership] Step 6: Matching image against registered record...",
    );
    const matchResult = imageMatchesRegistered(registeredImage, suspectHashes);

    if (!matchResult.matched) {
      console.log("[Ownership] ❌ Image does not match");
      return res.status(403).json({
        verified: false,
        error:
          "Image does not match the registered image for this secret code.",
        message:
          "The uploaded image is different from the one registered with this secret code.",
        confidence: matchResult.confidence,
        votes: matchResult.votes,
      });
    }

    console.log(`[Ownership] ✅ Image matched via ${matchResult.method}`);

    // ── 8. Cross-Check txHash Against Etherscan (REAL blockchain verify) ─────
    console.log("[Ownership] Step 7: Cross-checking txHash on Etherscan...");
    const onChainResult = await verifyTxOnChain(
      registeredImage.txhash,
      registeredImage.network,
    );

    if (onChainResult.verified) {
      console.log(
        `[Ownership] ✅ On-chain verified — block ${onChainResult.blockNumber}`,
      );
    } else {
      console.log(`[Ownership] ⚠️  On-chain check: ${onChainResult.reason}`);
    }

    // ── 9. Return Ownership Certificate ──────────────────────────────────────
    return res.json({
      verified: true,
      message: "✅ Ownership verified successfully.",

      certificate: {
        imageId: registeredImage.id,
        title: registeredImage.title,
        description: registeredImage.description,
        registeredAt: registeredImage.createdat,
        matchMethod: matchResult.method,
        confidence: matchResult.confidence,
      },

      blockchain: {
        txHash: registeredImage.txhash,
        network: registeredImage.network || "ethereum-sepolia",
        ipfsHash: registeredImage.ipfshash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${registeredImage.ipfshash}`,

        // ── On-chain cross-check result ──────────────────────────────────────
        onChainVerified: onChainResult.verified,
        explorerUrl: onChainResult.explorerUrl || null,
        crossCheckNote: onChainResult.verified
          ? `✅ Transaction confirmed live on ${onChainResult.network === "zksync-sepolia" ? "zkSync Explorer" : "Etherscan"}${onChainResult.blockNumber ? ` (block ${onChainResult.blockNumber})` : ""}`
          : `⚠️  ${onChainResult.reason}`,
      },

      ownership: {
        status: "CONFIRMED",
        expiresAt: registeredImage.expiresat,
        message: `You are the verified owner of "${registeredImage.title}" registered on ${new Date(registeredImage.createdat).toDateString()}.`,
      },
    });
  } catch (error) {
    console.error("[Ownership] ❌ Unexpected error:", error);
    return res.status(500).json({
      error: "Ownership verification failed: " + error.message,
    });
  } finally {
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch (e) {
        /* ignore */
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /ownership-status/:imageId
//  Public route — no secret code needed
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ownership-status/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!imageId || isNaN(imageId)) {
      return res.status(400).json({ error: "Valid imageId is required" });
    }

    const image = await getImageById(parseInt(imageId));

    if (!image) {
      return res.status(404).json({
        registered: false,
        message: "No image found with this ID.",
      });
    }

    return res.json({
      registered: true,
      imageId: image.id,
      title: image.title,
      description: image.description,
      registeredAt: image.createdat,
      blockchain: {
        txHash: image.txhash,
        network: image.network || "ethereum-sepolia",
        ipfsHash: image.ipfshash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${image.ipfshash}`,
        explorerUrl: image.txhash
          ? `https://sepolia.etherscan.io/tx/${image.txhash}`
          : null,
      },
      message: `This image is registered and protected since ${new Date(image.createdat).toDateString()}.`,
    });
  } catch (error) {
    console.error("[Ownership] ❌ ownership-status error:", error);
    return res.status(500).json({
      error: "Failed to fetch ownership status: " + error.message,
    });
  }
});

module.exports = router;
