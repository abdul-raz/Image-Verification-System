import React, { useState } from "react";
import axios from "axios";
import "./Register.css";

export default function Register() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [network, setNetwork] = useState("L1"); // L1 or L2

  // Form State
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // File Handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
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
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !email) {
      setError("Please provide an image and an email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("email", email);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("network", network);

    try {
      // Assuming backend is running on localhost:5000
      const response = await axios.post(
        "http://localhost:5000/api/register",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      console.log("FULL BACKEND RESPONSE:", response.data); // ADD THIS LINE!
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          "An error occurred during registration. Is the backend running?",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Register Image</h1>
        <div className="page-subtitle">
          Anchor your image on-chain and secure your copyright via perceptual
          hashes.
        </div>
      </div>

      <div className="split-layout">
        {/* LEFT: FORM PANEL */}
        <div className="form-panel">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Creator Email *</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || result}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Image Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sunset at Marina Beach"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting || result}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Add context or usage rights..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting || result}
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Registration Network</label>
              <div className="network-toggle">
                <button
                  type="button"
                  className={`net-btn ${network === "L1" ? "active-eth" : "inactive"}`}
                  onClick={() => setNetwork("L1")}
                  disabled={isSubmitting || result}
                >
                  L1 Ethereum
                </button>
                <button
                  type="button"
                  className={`net-btn ${network === "L2" ? "active-zk" : "inactive"}`}
                  onClick={() => setNetwork("L2")}
                  disabled={isSubmitting || result}
                >
                  L2 zkSync
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  color: "var(--error)",
                  fontSize: "var(--text-sm)",
                  marginBottom: "16px",
                  background: "var(--error-bg)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(248,113,113,0.3)",
                }}
              >
                {error}
              </div>
            )}

            {!result && (
              <button
                type="submit"
                className="btn btn-primary glow"
                disabled={isSubmitting || !file || !email}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner"></div> Anchoring to Blockchain...
                  </>
                ) : (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>{" "}
                    Register Image
                  </>
                )}
              </button>
            )}

            {result && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreview(null);
                  setTitle("");
                  setDescription("");
                }}
              >
                Register Another Image
              </button>
            )}
          </form>
        </div>

        {/* RIGHT: UPLOAD & RESULTS */}
        <div>
          {!result ? (
            <div
              className={`upload-zone ${isDragging ? "drag-active" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!preview ? (
                <>
                  <svg
                    className="upload-icon"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <div className="upload-text">
                    <strong>Drag & Drop</strong> image here
                  </div>
                  <div className="upload-subtext">
                    or click to browse your files
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-faint)",
                      marginTop: "16px",
                    }}
                  >
                    PNG, JPG, WEBP up to 10MB
                  </div>

                  <input
                    type="file"
                    className="file-input"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </>
              ) : (
                <>
                  <img src={preview} alt="Preview" className="image-preview" />
                  {!isSubmitting && (
                    <div className="preview-overlay">
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={removeFile}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Remove Image
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ── SUCCESS RESULT ── */
            <div className="result-card glow">
              <div className="result-header">
                <div className="result-title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Registration Successful
                </div>
                <div className="badge-success">
                  <div className="dot"></div>SECURED
                </div>
              </div>

              <div className="result-body">
                {/* Secret Code (CRITICAL UI) */}
                <div className="secret-code-box">
                  <div className="secret-code-header">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Save Your Secret Code
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      marginBottom: "12px",
                    }}
                  >
                    You must save this code immediately. It will not be shown
                    again. You need this code to prove ownership of the image
                    later.
                  </div>
                  <div className="secret-code-value">
                    {result.privacy?.secretCode || "XXXX-XXXX-XXXX-XXXX"}
                  </div>
                </div>

                {/* Blockchain Info */}
                <div className="hash-display">
                  <div>
                    <div className="hash-label">
                      Transaction Hash (
                      {result.blockchain?.network === "zksync-sepolia"
                        ? "L2 zkSync"
                        : "L1 Ethereum"}
                      )
                    </div>
                    <div className="hash-value" style={{ marginTop: "4px" }}>
                      {result.blockchain?.txHash}
                    </div>
                  </div>
                </div>

                {/* IPFS Info */}
                <div className="hash-display">
                  <div>
                    <div className="hash-label">IPFS CID (Evidence Pin)</div>
                    <div className="hash-value" style={{ marginTop: "4px" }}>
                      {result.ipfs?.hash}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: "12px", marginTop: "24px" }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, height: "40px", fontSize: "13px" }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (result.blockchain?.explorerUrl) {
                        window.open(
                          result.blockchain.explorerUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      } else {
                        alert("Explorer URL not available yet");
                      }
                    }}
                  >
                    View on Explorer
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, height: "40px", fontSize: "13px" }}
                    onClick={(e) => {
                      e.preventDefault();
                      // Use result.ipfs.url from your backend response
                      if (result.ipfs?.url) {
                        window.open(
                          result.ipfs.url,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      } else {
                        alert("IPFS URL not available");
                      }
                    }}
                  >
                    View on IPFS
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
