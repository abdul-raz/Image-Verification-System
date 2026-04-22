// services/imageService.js
const sharp = require("sharp");

// ─────────────────────────────────────────────────────────────────────────────
//  SUPPORTED FORMATS
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_FORMATS = ["jpeg", "jpg", "png", "webp", "gif", "tiff", "bmp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─────────────────────────────────────────────────────────────────────────────
//  VALIDATE & NORMALIZE
//  Input:  raw image buffer (any format, any size)
//  Output:
//    normalizedBuffer — 512×512 PNG, EXIF stripped  ← used for hashing ONLY
//    originalBuffer   — original image as-is         ← used for IPFS storage
// ─────────────────────────────────────────────────────────────────────────────

async function validateAndNormalize(buffer) {
  try {
    // ── 1. Basic buffer check ────────────────────────────────────────────────
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return { success: false, error: "Invalid image data received" };
    }

    if (buffer.length === 0) {
      return { success: false, error: "Empty image buffer" };
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Image too large. Maximum size is 10MB (received ${(buffer.length / 1024 / 1024).toFixed(1)}MB)`,
      };
    }

    // ── 2. Read image metadata (validates it's a real image) ─────────────────
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch (err) {
      return {
        success: false,
        error: "File is not a valid image or format is unsupported",
      };
    }

    // ── 3. Check format is supported ─────────────────────────────────────────
    if (!metadata.format || !SUPPORTED_FORMATS.includes(metadata.format)) {
      return {
        success: false,
        error: `Unsupported format: ${metadata.format || "unknown"}. Supported: ${SUPPORTED_FORMATS.join(", ")}`,
      };
    }

    // ── 4. Check minimum dimensions ──────────────────────────────────────────
    if (metadata.width < 32 || metadata.height < 32) {
      return {
        success: false,
        error: `Image too small (${metadata.width}×${metadata.height}). Minimum is 32×32 pixels`,
      };
    }

    console.log(
      `[ImageService] Input: ${metadata.width}×${metadata.height} ${metadata.format.toUpperCase()}`,
    );

    // ── 5. Normalize → 512×512 PNG for HASHING ───────────────────────────────
    // Uses contain (fit inside) + white background — NO cropping
    // This keeps hash computation consistent across all images per the paper
    const normalizedBuffer = await sharp(buffer)
      .resize(512, 512, {
        fit: "contain", // ← fit inside 512×512, NO cropping
        position: "centre",
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // white padding
      })
      .png({
        compressionLevel: 6,
        adaptiveFiltering: false,
      })
      .withMetadata(false) // strip EXIF from normalized copy
      .toBuffer();

    console.log(
      `[ImageService] ✅ Normalized to 512×512 PNG (hashing) — ${(normalizedBuffer.length / 1024).toFixed(1)}KB`,
    );

    // ── 6. Original buffer → strip EXIF only, keep original dimensions ───────
    // This is what gets stored on IPFS — full image, no crop, no resize
    const originalBuffer = await sharp(buffer)
      .withMetadata(false) // strip EXIF (removes GPS, camera, author info)
      .toBuffer();

    console.log(
      `[ImageService] ✅ Original preserved (IPFS) — ${metadata.width}×${metadata.height}, ${(originalBuffer.length / 1024).toFixed(1)}KB`,
    );

    return {
      success: true,
      normalizedBuffer, // → used by computeHashes()
      originalBuffer, // → used by uploadToPinata()
      originalFormat: metadata.format,
      originalDimensions: {
        width: metadata.width,
        height: metadata.height,
      },
    };
  } catch (error) {
    console.error("[ImageService] ❌ Error:", error.message);
    return {
      success: false,
      error: "Image processing failed: " + error.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = { validateAndNormalize };
