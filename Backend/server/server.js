const express = require("express");
const cors = require("cors");
const multer = require("multer");
const config = require("./config/env");

// Routes
const imagesRoute = require("./routes/images"); // POST /register
const verifyRoutes = require("./routes/verify"); // POST /verify
const ownershipRoutes = require("./routes/ownership");

// DB
const { testConnection, runMigrations } = require("./services/databaseService");

const app = express();
const PORT = config.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Startup DB ───────────────────────────────────────────────────────────────
(async () => {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error("❌ Cannot connect to DB — check .env settings");
    process.exit(1);
  }
  await runMigrations();
})();

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", imagesRoute); // → POST /api/register
app.use("/api", verifyRoutes); // → POST /api/verify
app.use("/api", ownershipRoutes);
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    server: `Running on port ${PORT}`,
    routes: {
      register: `POST http://localhost:${PORT}/api/register`,
      verify: `POST http://localhost:${PORT}/api/verify`,
      health: `GET  http://localhost:${PORT}/api/health`,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Multer-specific errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Wrong field name. Use 'image' as the file field name.",
        expected: "image",
        received: err.field,
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large. Maximum size is 10MB.",
      });
    }
    return res.status(400).json({
      error: "File upload error: " + err.message,
    });
  }

  // General errors
  console.error("[Server] ❌ Unhandled error:", err.message);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Register → POST http://localhost:${PORT}/api/register`);
  console.log(`   Verify   → POST http://localhost:${PORT}/api/verify`);
  console.log(`   Health   → GET  http://localhost:${PORT}/api/health`);
});
