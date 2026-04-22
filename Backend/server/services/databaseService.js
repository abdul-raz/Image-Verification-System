const { Pool } = require("pg");
const config = require("../config/env");

// ─────────────────────────────────────────────────────────────────────────────
//  CONNECTION POOL
// ─────────────────────────────────────────────────────────────────────────────

const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err.message);
});

// ─────────────────────────────────────────────────────────────────────────────
//  SAVE REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

async function saveRegistration(data) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Insert or get creator ─────────────────────────────────────────────
    const creatorResult = await client.query(
      `INSERT INTO creators (creatorhash, secretcodehash)
       VALUES ($1, $2)
       ON CONFLICT (creatorhash) DO UPDATE SET creatorhash = EXCLUDED.creatorhash
       RETURNING id`,
      [data.creatorHash, data.secretCodeHash],
    );
    const creatorId = creatorResult.rows[0].id;

    // ── 2. Insert image ───────────────────────────────────────────────────────
    const imageResult = await client.query(
      `INSERT INTO images (
         imagehash,
         creatorid,
         phashstring,
         dhashstring,
         ahashstring,
         whashstring,
         crophashstring,
         ipfshash,
         blockchaintxhash,
         blockchainblocknumber,
         title,
         description,
         network
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        data.sha256,
        creatorId,
        data.pHash || null,
        data.dHash || null,
        data.aHash || null,
        data.wHash || null,
        data.cropHash || null,
        data.ipfsHash,
        data.txHash,
        data.blockNumber || null,
        data.title || "Untitled",
        data.description || "",
        data.network || "ethereum-sepolia",
      ],
    );
    const imageId = imageResult.rows[0].id;

    // ── 3. Insert verification code (1-year expiry) ──────────────────────────
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO verificationcodes (imageid, creatorid, secretcodehash, expiresat)
       VALUES ($1, $2, $3, $4)`,
      [imageId, creatorId, data.secretCodeHash, expiresAt],
    );

    // ── 4. Audit log ─────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO auditlog (action, actor, targetimageid, details)
       VALUES ($1, $2, $3, $4)`,
      [
        "REGISTER",
        data.creatorHash,
        imageId,
        JSON.stringify({
          ipfsHash: data.ipfsHash,
          txHash: data.txHash,
          blockNumber: data.blockNumber,
          network: data.network || "ethereum-sepolia",
          title: data.title,
        }),
      ],
    );

    await client.query("COMMIT");
    console.log(
      `[DB] ✅ Registration saved — imageId: ${imageId}, creatorId: ${creatorId}, network: ${data.network}`,
    );

    return { success: true, imageId, creatorId };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[DB] ❌ saveRegistration failed:", error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL IMAGES
// ─────────────────────────────────────────────────────────────────────────────

async function getAllImages() {
  try {
    const result = await pool.query(
      `SELECT
         id,
         imagehash,
         phashstring,
         dhashstring,
         ahashstring,
         whashstring,
         crophashstring,
         title,
         description,
         ipfshash,
         blockchaintxhash      AS txhash,
         blockchainblocknumber,
         network,
         registeredat          AS createdat
       FROM images
       ORDER BY registeredat DESC`,
    );
    console.log(`[DB] getAllImages → ${result.rows.length} row(s)`);
    return result.rows;
  } catch (error) {
    console.error("[DB] ❌ getAllImages failed:", error.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET IMAGE BY SECRET CODE
// ─────────────────────────────────────────────────────────────────────────────

async function getImageBySecretCode(secretCodeHash) {
  try {
    const result = await pool.query(
      `SELECT
         i.id,
         i.imagehash,
         i.phashstring,
         i.dhashstring,
         i.ahashstring,
         i.whashstring,
         i.crophashstring,
         i.title,
         i.description,
         i.ipfshash,
         i.blockchaintxhash    AS txhash,
         i.network,
         i.registeredat        AS createdat,
         v.secretcodehash,
         v.expiresat
       FROM images i
       JOIN verificationcodes v ON i.id = v.imageid
       WHERE v.secretcodehash = $1
         AND v.expiresat > NOW()
       LIMIT 1`,
      [secretCodeHash],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    console.error("[DB] ❌ getImageBySecretCode failed:", error.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET IMAGE BY ID
// ─────────────────────────────────────────────────────────────────────────────

async function getImageById(imageId) {
  try {
    const result = await pool.query(
      `SELECT
         id,
         imagehash,
         phashstring,
         dhashstring,
         ahashstring,
         whashstring,
         crophashstring,
         title,
         description,
         ipfshash,
         blockchaintxhash      AS txhash,
         blockchainblocknumber,
         network,
         registeredat          AS createdat
       FROM images
       WHERE id = $1`,
      [imageId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("[DB] ❌ getImageById failed:", error.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOG VERIFICATION ATTEMPT
// ─────────────────────────────────────────────────────────────────────────────

async function logVerificationAttempt(imageId, result, compositeScore) {
  try {
    await pool.query(
      `INSERT INTO auditlog (action, actor, targetimageid, details)
       VALUES ($1, $2, $3, $4)`,
      [
        "VERIFY",
        "api",
        imageId,
        JSON.stringify({
          result: result,
          compositeScore: compositeScore,
          timestamp: new Date().toISOString(),
        }),
      ],
    );
  } catch (error) {
    console.warn("[DB] ⚠️ logVerificationAttempt skipped:", error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONNECTION TEST
// ─────────────────────────────────────────────────────────────────────────────

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    console.log("✅ Database connected:", result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MIGRATIONS — run on startup
// ─────────────────────────────────────────────────────────────────────────────

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("[DB] Running migrations...");

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'images' AND column_name = 'croprashstring'
        ) THEN
          ALTER TABLE images RENAME COLUMN croprashstring TO crophashstring;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'images' AND column_name = 'crophashstring'
        ) THEN
          ALTER TABLE images ADD COLUMN crophashstring TEXT;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'images' AND column_name = 'centercrashstring'
        ) THEN
          ALTER TABLE images DROP COLUMN centercrashstring;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'images' AND column_name = 'colorhistogram'
        ) THEN
          ALTER TABLE images DROP COLUMN colorhistogram;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'images' AND column_name = 'network'
        ) THEN
          ALTER TABLE images ADD COLUMN network VARCHAR(30) DEFAULT 'ethereum-sepolia';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'images' AND column_name = 'l1txhash'
        ) THEN
          ALTER TABLE images ADD COLUMN l1txhash VARCHAR(100);
        END IF;

      END $$;
    `);

    console.log("[DB] ✅ Migrations complete");
  } catch (error) {
    console.error("[DB] ❌ Migration failed:", error.message);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  pool,
  saveRegistration,
  getAllImages,
  getImageBySecretCode,
  getImageById,
  logVerificationAttempt,
  testConnection,
  runMigrations,
};
