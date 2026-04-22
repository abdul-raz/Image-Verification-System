// services/hashService.js
const crypto = require("crypto");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

function computeSHA256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function computePerceptualHashes(imageBuffer) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(
      os.tmpdir(),
      `temp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`,
    );

    try {
      fs.writeFileSync(tempFile, imageBuffer);
    } catch (err) {
      return reject(new Error("Failed to write temp file: " + err.message));
    }

    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "python",
      "compute_hashes.py",
    );

    const py = spawn("python", [scriptPath, tempFile], {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    py.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error("[Python stderr]:", data.toString());
    });

    py.on("close", (code) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}

      if (code !== 0) {
        return reject(
          new Error(`Python error (code ${code}): ${stderr || stdout}`),
        );
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success) {
          return reject(new Error(result.error || "Unknown Python error"));
        }
        resolve(result);
      } catch (e) {
        reject(new Error("Parse error: " + e.message + " | Output: " + stdout));
      }
    });

    py.on("error", (err) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      reject(new Error("Python process error: " + err.message));
    });
  });
}

async function computeHashes(imageBuffer) {
  try {
    const sha256 = computeSHA256(imageBuffer);
    const perceptual = await computePerceptualHashes(imageBuffer);

    // Paper: SHA256 + 5 perceptual hashes ONLY
    console.log("[HashService] ✅ Hashes computed:");
    console.log("  pHash:", perceptual.pHash);
    console.log("  dHash:", perceptual.dHash);
    console.log("  aHash:", perceptual.aHash);
    console.log("  wHash:", perceptual.wHash);
    console.log("  cropHash:", perceptual.cropHash);

    return {
      success: true,
      sha256,
      pHash: perceptual.pHash,
      dHash: perceptual.dHash,
      aHash: perceptual.aHash,
      wHash: perceptual.wHash,
      cropHash: perceptual.cropHash,
      // centerCrop + colorHistogram REMOVED — not in paper
    };
  } catch (error) {
    console.error("[HashService] ❌ Error:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { computeHashes };
