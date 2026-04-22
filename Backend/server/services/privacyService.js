const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../config/env");

function hashEmail(email) {
  const salt = config.CREATOR_SALT;
  return crypto
    .createHash("sha256")
    .update(email + salt)
    .digest("hex");
}

function generateSecretCode() {
  // Generate 32 random bytes and convert to base64
  return crypto.randomBytes(32).toString("base64");
}

function hashSecretCode(secretCode) {
  const salt = config.SECRET_CODE_SALT;
  return crypto
    .createHash("sha256")
    .update(secretCode + salt)
    .digest("hex");
}

async function createPrivacyRecord(email) {
  try {
    const creatorHash = hashEmail(email);
    const secretCode = generateSecretCode();
    const secretCodeHash = hashSecretCode(secretCode);

    return {
      success: true,
      creatorHash: creatorHash,
      secretCode: secretCode, // Return to creator (one time only!)
      secretCodeHash: secretCodeHash, // Store in DB
      email: email, // Only in this response, never stored plain
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  hashEmail,
  generateSecretCode,
  hashSecretCode,
  createPrivacyRecord,
};
