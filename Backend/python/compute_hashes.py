import sys
import json
import hashlib
from PIL import Image
import imagehash as img_hash


def compute_quadrant_crop_hash(img_gray):
    """
    Paper Section 3.6:
    Split image into 4 equal quadrants, compute pHash on each,
    concatenate all 4 hex strings → single cropHash string.
    """
    w, h = img_gray.size

    # Cut into 4 equal quadrants
    quadrants = [
        img_gray.crop((0,    0,    w//2, h//2)),  # top-left
        img_gray.crop((w//2, 0,    w,    h//2)),  # top-right
        img_gray.crop((0,    h//2, w//2, h)),     # bottom-left
        img_gray.crop((w//2, h//2, w,    h)),     # bottom-right
    ]

    # pHash each quadrant and concatenate hex strings
    crop_hash = "".join([str(img_hash.phash(q)) for q in quadrants])
    return crop_hash


def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"success": False, "error": "No file path provided"}))
            sys.exit(1)

        file_path = sys.argv[1]

        # ── Open Image ─────────────────────────────────────────────────────────
        img_rgb  = Image.open(file_path).convert("RGB")
        img_gray = img_rgb.convert("L")

        # ── Paper: 5 Perceptual Hashes ─────────────────────────────────────────
        phash_result = img_hash.phash(img_gray)
        dhash_result = img_hash.dhash(img_gray)
        ahash_result = img_hash.average_hash(img_gray)
        whash_result = img_hash.whash(img_gray)

        # ── Paper: 4-Quadrant Crop Hash ─────────────────────────────────────────
        crop_hash = compute_quadrant_crop_hash(img_gray)

        # ── SHA-256 of Normalized File Bytes ───────────────────────────────────
        with open(file_path, "rb") as f:
            sha256 = hashlib.sha256(f.read()).hexdigest()

        result = {
            "success":  True,
            "sha256":   sha256,
            "pHash":    str(phash_result),
            "dHash":    str(dhash_result),
            "aHash":    str(ahash_result),
            "wHash":    str(whash_result),
            "cropHash": crop_hash,         # 4 quadrant pHashes concatenated
            # centerCrop + colorHistogram REMOVED — not in paper
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        import traceback
        print(json.dumps({
            "success":   False,
            "error":     str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()