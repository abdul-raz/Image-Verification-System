const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const upload = require("../middleware/upload");
const { validateAndNormalize } = require("../services/imageService");
const {
  getAllImages,
  logVerificationAttempt,
} = require("../services/databaseService");

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
//  PAPER FORMULA CONSTANTS (Section 3.7)
//  S = 0.30·SHA + 0.20·pHash + 0.15·dHash + 0.10·aHash + 0.10·wHash + 0.15·cropHash
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  sha256: 0.3,
  pHash: 0.2,
  dHash: 0.15,
  aHash: 0.1,
  wHash: 0.1,
  cropHash: 0.15,
};

const TAU = {
  pHash: 10,
  dHash: 10,
  aHash: 10,
  wHash: 10,
  cropHash: 20,
};

const CLASSIFY = {
  EXACT: 0.95,
  EDITED: 0.5,
};

// Option C — Perceptual Fallback
const PERCEPTUAL_FALLBACK = {
  minVotes: 3, // 3 of 4 perceptual hashes must agree
  minSimilarity: 0.6, // each agreeing hash must be >= 0.60
  minScore: 0.35, // composite score must be at least 0.35
};

// ─────────────────────────────────────────────────────────────────────────────
//  MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function expDecaySim(d, tau) {
  if (!isFinite(d)) return 0.0;
  if (d === 0) return 1.0;
  return Math.max(0, Math.exp(-d / tau));
}

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

// ─────────────────────────────────────────────────────────────────────────────
//  SEVERITY — Fixed to use globalSim first (avoids false "Severe" from crop)
//  Priority: globalSim (perceptual) → cropHash distance (spatial)
// ─────────────────────────────────────────────────────────────────────────────

function buildSeverity(cropDist, sim) {
  // Global perceptual similarity — average of 4 perceptual hashes
  const globalSim = (sim.pHash + sim.dHash + sim.aHash + sim.wHash) / 4;

  console.log(
    `[Severity] globalSim: ${globalSim.toFixed(3)} cropDist: ${cropDist}`,
  );

  // If perceptual hashes say very similar → light edit (brightness, contrast, minor crop)
  if (globalSim >= 0.7) return { level: "Light", percentage: 15 };
  if (globalSim >= 0.55) return { level: "Moderate", percentage: 40 };

  // Below 0.55 globalSim → use cropHash distance for spatial severity
  if (!isFinite(cropDist) || cropDist < 4)
    return { level: "None", percentage: 0 };
  if (cropDist < 10) return { level: "Light", percentage: 15 };
  if (cropDist < 18) return { level: "Moderate", percentage: 40 };
  if (cropDist < 26) return { level: "Heavy", percentage: 65 };
  return { level: "Severe", percentage: 90 };
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSITE SCORE (Equation 4 from paper)
// ─────────────────────────────────────────────────────────────────────────────

function computeCompositeScore(registered, suspect) {
  // SHA-256: exact binary match — DB col: imagehash
  const sha256Score = registered.imagehash === suspect.sha256 ? 1.0 : 0.0;

  console.log(`[Score] SHA256 match : ${sha256Score === 1.0}`);
  console.log(
    `[Score] DB  hash     : ${registered.imagehash?.substring(0, 16)}...`,
  );
  console.log(`[Score] Suspect hash : ${suspect.sha256?.substring(0, 16)}...`);

  // Hamming distances — exact DB column names
  const d = {
    pHash: hammingDistance(registered.phashstring, suspect.pHash),
    dHash: hammingDistance(registered.dhashstring, suspect.dHash),
    aHash: hammingDistance(registered.ahashstring, suspect.aHash),
    wHash: hammingDistance(registered.whashstring, suspect.wHash),
    cropHash: hammingDistance(registered.crophashstring, suspect.cropHash),
  };

  console.log(
    `[Score] Distances → pHash:${d.pHash} dHash:${d.dHash} aHash:${d.aHash} wHash:${d.wHash} cropHash:${d.cropHash}`,
  );

  // Exp decay similarities (Equation 3)
  const sim = {
    pHash: expDecaySim(d.pHash, TAU.pHash),
    dHash: expDecaySim(d.dHash, TAU.dHash),
    aHash: expDecaySim(d.aHash, TAU.aHash),
    wHash: expDecaySim(d.wHash, TAU.wHash),
    cropHash: expDecaySim(d.cropHash, TAU.cropHash),
  };

  // Composite score S (Equation 4)
  const S =
    WEIGHTS.sha256 * sha256Score +
    WEIGHTS.pHash * sim.pHash +
    WEIGHTS.dHash * sim.dHash +
    WEIGHTS.aHash * sim.aHash +
    WEIGHTS.wHash * sim.wHash +
    WEIGHTS.cropHash * sim.cropHash;

  console.log(
    `[Score] Sims → p:${sim.pHash.toFixed(3)} d:${sim.dHash.toFixed(3)} a:${sim.aHash.toFixed(3)} w:${sim.wHash.toFixed(3)} crop:${sim.cropHash.toFixed(3)}`,
  );
  console.log(`[Score] Composite S = ${S.toFixed(3)}`);

  return {
    compositeScore: parseFloat(S.toFixed(3)),
    sha256Exact: sha256Score === 1.0,
    distances: d,
    similarities: {
      sha256: parseFloat(sha256Score.toFixed(3)),
      pHash: parseFloat(sim.pHash.toFixed(3)),
      dHash: parseFloat(sim.dHash.toFixed(3)),
      aHash: parseFloat(sim.aHash.toFixed(3)),
      wHash: parseFloat(sim.wHash.toFixed(3)),
      cropHash: parseFloat(sim.cropHash.toFixed(3)),
    },
    severity: buildSeverity(d.cropHash, sim),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  OPTION C — PERCEPTUAL FALLBACK
//  Catches brightness+crop edits where cropHash drags composite below 0.50
// ─────────────────────────────────────────────────────────────────────────────

function applyPerceptualFallback(classification, bestScore, similarities) {
  if (classification !== "DIFFERENT") {
    return { classification, fallbackTriggered: false, votes: null };
  }

  const votes = [
    similarities.pHash,
    similarities.dHash,
    similarities.aHash,
    similarities.wHash,
  ].filter((s) => s >= PERCEPTUAL_FALLBACK.minSimilarity).length;

  const fallbackTriggered =
    votes >= PERCEPTUAL_FALLBACK.minVotes &&
    bestScore >= PERCEPTUAL_FALLBACK.minScore;

  if (fallbackTriggered) {
    console.log(
      `[Verify] ⚡ Perceptual fallback triggered — ${votes}/4 hashes agree (score: ${bestScore})`,
    );
    return { classification: "EDITED", fallbackTriggered: true, votes };
  }

  return { classification, fallbackTriggered: false, votes };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PYTHON — compute hashes of suspect image
// ─────────────────────────────────────────────────────────────────────────────

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
//  POST /verify
// ─────────────────────────────────────────────────────────────────────────────

router.post("/verify", upload.single("image"), async (req, res) => {
  let tempImagePath = null;

  try {
    // ── 1. File Check ────────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // ── 2. Normalize Image ───────────────────────────────────────────────────
    console.log("[Verify] Step 1: Normalizing image...");
    const validationResult = await validateAndNormalize(req.file.buffer);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    console.log("[Verify] ✅ Image normalized");

    // ── 3. Write Temp File for Python ────────────────────────────────────────
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    tempImagePath = path.join(
      uploadsDir,
      `verify_${Date.now()}_${Math.random().toString(36).slice(2)}.png`,
    );
    fs.writeFileSync(tempImagePath, validationResult.normalizedBuffer);

    // ── 4. Compute Hashes via Python ─────────────────────────────────────────
    console.log("[Verify] Step 2: Computing hashes...");
    let suspectHashes;
    try {
      suspectHashes = await computeHashesPython(tempImagePath);
    } catch (pyError) {
      return res.status(400).json({
        error: "Hash computation failed: " + pyError.message,
      });
    }

    if (!suspectHashes || !suspectHashes.sha256) {
      return res
        .status(400)
        .json({ error: "Python returned invalid hash output" });
    }

    console.log("[Verify] ✅ Hashes computed");
    console.log("[Verify] SHA256   :", suspectHashes.sha256);
    console.log("[Verify] pHash    :", suspectHashes.pHash);
    console.log("[Verify] cropHash :", suspectHashes.cropHash);

    // ── 5. Fetch All Registered Images ───────────────────────────────────────
    console.log("[Verify] Step 3: Fetching registered images...");
    const registeredImages = await getAllImages();

    if (!registeredImages || registeredImages.length === 0) {
      return res.json({
        found: false,
        classification: "DIFFERENT",
        compositeScore: 0,
        message: "No images registered in the system yet.",
      });
    }

    console.log(
      `[Verify] Comparing against ${registeredImages.length} registered image(s)...`,
    );

    // ── 6. Score Against Every Registered Image ──────────────────────────────
    let bestMatch = null;
    let bestScore = 0;
    let bestResult = null;

    for (const row of registeredImages) {
      const result = computeCompositeScore(row, suspectHashes);
      if (result.compositeScore > bestScore) {
        bestScore = result.compositeScore;
        bestMatch = row;
        bestResult = result;
      }
    }

    // ── 7. Primary Classification — Paper Thresholds ─────────────────────────
    let classification;
    if (bestScore >= CLASSIFY.EXACT) classification = "EXACT";
    else if (bestScore >= CLASSIFY.EDITED) classification = "EDITED";
    else classification = "DIFFERENT";

    console.log(`[Verify] Primary: ${bestScore} → ${classification}`);

    // ── 8. Option C — Perceptual Fallback ────────────────────────────────────
    const fallback = applyPerceptualFallback(
      classification,
      bestScore,
      bestResult.similarities,
    );
    classification = fallback.classification;

    console.log(
      `[Verify] ✅ Final: ${classification}${fallback.fallbackTriggered ? " (perceptual fallback)" : ""}`,
    );

    // ── 9. Log Attempt ────────────────────────────────────────────────────────
    if (bestMatch) {
      await logVerificationAttempt(bestMatch.id, classification, bestScore);
    }

    // ── 10. DIFFERENT — Not Found ─────────────────────────────────────────────
    if (classification === "DIFFERENT") {
      return res.json({
        found: false,
        classification: "DIFFERENT",
        compositeScore: bestScore,
        message: "This image is not registered in the system.",
        debugScores: bestResult ? bestResult.similarities : null,
      });
    }

    // ── 11. EXACT or EDITED — Full Certificate ────────────────────────────────
    return res.json({
      found: true,
      classification,
      compositeScore: bestResult.compositeScore,
      sha256Exact: bestResult.sha256Exact,

      detectionMethod: fallback.fallbackTriggered
        ? `perceptual-fallback (${fallback.votes}/4 hashes agreed)`
        : "composite-score",

      scores: bestResult.similarities,
      distances: bestResult.distances,

      severity: {
        level: bestResult.severity.level,
        percentage: bestResult.severity.percentage,
        message:
          classification === "EXACT"
            ? "Perfect cryptographic match — original confirmed"
            : `Edited copy detected — severity: ${bestResult.severity.level} (~${bestResult.severity.percentage}% modified)`,
      },

      registeredImage: {
        imageId: bestMatch.id,
        title: bestMatch.title,
        description: bestMatch.description,
        ipfsHash: bestMatch.ipfshash,
        txHash: bestMatch.txhash,
        timestamp: bestMatch.createdat,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${bestMatch.ipfshash}`,
      },

      message:
        classification === "EXACT"
          ? "✅ This image is an exact copy of a registered work."
          : `⚠️ This image appears to be an edited copy (score: ${bestResult.compositeScore}).`,
    });
  } catch (error) {
    console.error("[Verify] ❌ Unexpected error:", error);
    return res.status(500).json({
      error: "Verification failed: " + error.message,
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

module.exports = router;
