import React, { useState } from "react";
import axios from "axios";
import "./Verify.css";

export default function Verify() {
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const processFile = async (selectedFile) => {
    setIsVerifying(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      // Connect to your backend API route: /api/verify
      const response = await axios.post(
        "http://localhost:5000/api/verify",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      console.log("VERIFY RESPONSE:", response.data);
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "An error occurred during verification.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const resetVerification = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="verify-container">
      {/* Page Header */}
      <div className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">Verify Image</h1>
        <div className="page-subtitle">
          Upload any image to check if it's registered in the HashGuard
          database.
        </div>
      </div>

      {error && (
        <div
          style={{
            color: "var(--error)",
            fontSize: "var(--text-base)",
            marginBottom: "16px",
            background: "var(--error-bg)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(248,113,113,0.3)",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {/* ── UPLOAD STATE ── */}
      {!result && !isVerifying && (
        <div
          className={`upload-zone-large ${isDragging ? "drag-active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <svg
            className="upload-icon-large"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="upload-text-large">Drop Image to Verify</div>
          <div className="upload-subtext-large">
            We'll check its perceptual hashes against the registry.
          </div>

          <input
            type="file"
            className="file-input"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── VERIFYING STATE (LOADING SPINNER) ── */}
      {isVerifying && (
        <div className="upload-zone-large" style={{ cursor: "default" }}>
          <div className="verify-spinner"></div>
          <div className="verifying-text">Analyzing Perceptual Hashes...</div>
          <div className="upload-subtext-large" style={{ marginTop: "12px" }}>
            Querying database for matches.
          </div>
        </div>
      )}

      {/* ── RESULT STATE ── */}
      {result && (
        <div>
          {/* EXACT MATCH */}
          {result.classification === "EXACT" && (
            <div className="verify-result-card verify-status-exact">
              <div className="verify-header">
                <div
                  className="verify-title"
                  style={{ color: "var(--success)" }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Exact Match Found
                </div>
                <div className="badge badge-success">
                  <div className="dot"></div>EXACT
                </div>
              </div>
              <div className="verify-body">
                <div className="match-details">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">Image Title</div>
                      <div className="detail-value">
                        {result.registeredImage?.title || "Untitled Image"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Registration Date</div>
                      <div className="detail-value">
                        {result.registeredImage?.timestamp
                          ? new Date(
                              result.registeredImage.timestamp,
                            ).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Match Method</div>
                      <div
                        className="detail-value"
                        style={{ color: "var(--success)" }}
                      >
                        {result.severity?.message || "SHA-256 Match"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">IPFS CID</div>
                      <div
                        className="detail-value"
                        style={{ fontSize: "var(--text-sm)" }}
                      >
                        <a
                          href={result.registeredImage?.ipfsUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "var(--cyan)",
                            textDecoration: "underline",
                          }}
                        >
                          View Evidence
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    background: "var(--surface-3)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginBottom: "4px",
                      fontWeight: 600,
                    }}
                  >
                    TRANSACTION HASH
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      color: "var(--cyan)",
                      wordBreak: "break-all",
                    }}
                  >
                    {result.registeredImage?.txHash || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDITED MATCH */}
          {result.classification === "EDITED" && (
            <div className="verify-result-card verify-status-edited">
              <div className="verify-header">
                <div
                  className="verify-title"
                  style={{ color: "var(--warning)" }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                  Edited Version Detected
                </div>
                <div className="badge badge-warning">
                  <div className="dot"></div>EDITED
                </div>
              </div>
              <div className="verify-body">
                <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
                  {result.message ||
                    "This image appears to be a cropped, resized, or filtered version of a registered image."}
                </p>
                <div className="match-details">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">Original Title</div>
                      <div className="detail-value">
                        {result.registeredImage?.title || "Untitled Image"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Match Method</div>
                      <div
                        className="detail-value"
                        style={{ color: "var(--warning)" }}
                      >
                        {result.severity?.message || "Perceptual Match"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DIFFERENT MATCH */}
          {(result.classification === "DIFFERENT" ||
            result.found === false) && (
            <div className="verify-result-card verify-status-diff">
              <div className="verify-header">
                <div className="verify-title" style={{ color: "var(--error)" }}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  No Match Found
                </div>
                <div className="badge badge-error">
                  <div className="dot"></div>UNREGISTERED
                </div>
              </div>
              <div
                className="verify-body"
                style={{ textAlign: "center", padding: "40px 20px" }}
              >
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "var(--text-lg)",
                  }}
                >
                  This image does not exist in the HashGuard registry.
                </p>
                <p style={{ color: "var(--text-faint)", marginTop: "8px" }}>
                  Neither the exact file nor any perceptually similar versions
                  were found.
                </p>
              </div>
            </div>
          )}

          <div className="action-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetVerification}
              style={{
                width: "auto",
                padding: "0 32px",
                height: "48px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Verify Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
