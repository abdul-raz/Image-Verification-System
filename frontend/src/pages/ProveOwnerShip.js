import React, { useState, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./ProveOwnership.css";

export default function ProveOwnership() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [secretCode, setSecretCode] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [isProving, setIsProving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Ref for the certificate div
  const certificateRef = useRef(null);

  // File Handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
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
      setFile(e.dataTransfer.files[0]);
      setPreview(URL.createObjectURL(e.dataTransfer.files[0]));
    }
  };

  // Submit Handler
  const handleProve = async (e) => {
    e.preventDefault();
    if (!file || !secretCode) {
      setError("Both an image and your Secret Code are required.");
      return;
    }

    setIsProving(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("secretCode", secretCode);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/prove-ownership",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      console.log("PROVE RESPONSE:", response.data);
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          "An error occurred. Check your code and image.",
      );

      if (err.response?.data?.verified === false) {
        setResult(err.response.data);
        setError(null);
      }
    } finally {
      setIsProving(false);
    }
  };

  // PDF Generation Handler
  const downloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      // Temporarily remove shadow for cleaner PDF render
      const originalShadow = certificateRef.current.style.boxShadow;
      certificateRef.current.style.boxShadow = "none";

      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // Allow external images (like Pinata gateway if used)
        backgroundColor: "#ffffff",
      });

      certificateRef.current.style.boxShadow = originalShadow;

      const imgData = canvas.toDataURL("image/png");

      // Calculate dimensions (A4 paper size: 210 x 297 mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save(
        `HashGuard-Certificate-${result.certificate?.title || "Untitled"}.pdf`,
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setFile(null);
    setPreview(null);
    setSecretCode("");
  };

  return (
    <div className="prove-container">
      <div className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">Prove Ownership</h1>
        <div className="page-subtitle">
          Submit your image and secret code to generate a cryptographically
          verified ownership certificate.
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

      {/* ── INPUT FORM ── */}
      {!result && (
        <form className="prove-form-card" onSubmit={handleProve}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              1. Provide Image
            </div>
            <div
              className={`prove-upload-zone ${isDragging ? "drag-active" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!preview ? (
                <>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--cyan)"
                    strokeWidth="1.5"
                    style={{ marginBottom: "12px", opacity: 0.8 }}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <div style={{ fontSize: "14px", color: "var(--text)" }}>
                    Upload Image
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Click or drag & drop
                  </div>
                  <input
                    type="file"
                    className="file-input"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isProving}
                  />
                </>
              ) : (
                <>
                  <img
                    src={preview}
                    alt="Preview"
                    className="prove-preview-img"
                  />
                  {!isProving && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "rgba(8,12,24,0.8)",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Change
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="prove-input-group">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                2. Enter Secret Code
              </div>
              <input
                type="text"
                className="secret-input"
                placeholder="XXXX-XXXX-XXXX"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                disabled={isProving}
                required
              />
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-faint)",
                  textAlign: "center",
                }}
              >
                The cryptographic code provided during registration.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary glow"
              style={{ marginTop: "auto", height: "56px", fontSize: "16px" }}
              disabled={isProving || !file || !secretCode}
            >
              {isProving ? (
                <>
                  <div
                    className="spinner"
                    style={{ width: "20px", height: "20px" }}
                  ></div>{" "}
                  Verifying On-Chain...
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>{" "}
                  Generate Certificate
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── SUCCESS CERTIFICATE ── */}
      {result && result.verified && (
        <>
          <div className="certificate-container" ref={certificateRef}>
            <div className="cert-header">
              <div className="cert-logo">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                HashGuard
              </div>
              <div className="cert-seal">
                <div className="cert-title">
                  Official Certificate of Ownership
                </div>
                <div className="cert-status">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  CRYPTOGRAPHICALLY VERIFIED
                </div>
              </div>
            </div>

            <div className="cert-body">
              <div className="cert-main-info">
                <img
                  src={preview}
                  alt="Certificate target"
                  className="cert-image"
                />

                <div className="cert-details">
                  <div className="cert-row">
                    <div className="cert-label">Original Title</div>
                    <div className="cert-value" style={{ fontSize: "24px" }}>
                      {result.certificate?.title || "Untitled Image"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div className="cert-row">
                      <div className="cert-label">Registration Date</div>
                      <div className="cert-value">
                        {result.certificate?.registeredAt
                          ? new Date(
                              result.certificate.registeredAt,
                            ).toLocaleString()
                          : "N/A"}
                      </div>
                    </div>
                    <div className="cert-row">
                      <div className="cert-label">Verification Status</div>
                      <div
                        className="cert-value"
                        style={{ color: "var(--success)" }}
                      >
                        Confirmed Original
                      </div>
                    </div>
                  </div>

                  <div className="cert-row">
                    <div className="cert-label">
                      IPFS Content Identifier (CID)
                    </div>
                    <div className="cert-mono">
                      {result.blockchain?.ipfsHash || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain Verification Box */}
              <div className="blockchain-verification-box">
                <div className="bv-header">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  </svg>
                  {result.blockchain?.network?.includes("zksync")
                    ? "zkSync L2 Validation"
                    : "Ethereum L1 Validation"}

                  <span
                    style={{
                      marginLeft: "auto",
                      background: "var(--success-bg)",
                      color: "var(--success)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                    }}
                  >
                    ✔ On-Chain Record Found
                  </span>
                </div>

                <div className="bv-grid">
                  <div className="cert-row">
                    <div className="cert-label">Transaction Hash</div>
                    <a
                      href={result.blockchain?.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cert-mono"
                      style={{
                        textDecoration: "none",
                        color: "var(--eth-blue)",
                      }}
                    >
                      {result.blockchain?.txHash || "N/A"}
                    </a>
                  </div>
                  <div className="cert-row">
                    <div className="cert-label">Evidence Link</div>
                    <a
                      href={result.blockchain?.ipfsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cert-mono"
                      style={{ textDecoration: "none" }}
                    >
                      View Original on IPFS ↗
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "8px",
                    borderTop: "1px solid rgba(98, 126, 234, 0.2)",
                    paddingTop: "12px",
                  }}
                >
                  {result.blockchain?.crossCheckNote ||
                    "This record was verified against the immutable smart contract registry."}
                  <br />
                  <span style={{ color: "var(--text)" }}>
                    {result.ownership?.message}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={resetForm}
              style={{ width: "200px" }}
            >
              Verify Another Code
            </button>
            <button
              className="btn btn-primary glow"
              onClick={downloadPDF}
              style={{ width: "200px", height: "40px" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
          </div>
        </>
      )}

      {/* ── FAILED CERTIFICATE (Wrong code or image) ── */}
      {result && result.verified === false && (
        <div className="fail-card">
          <div className="fail-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--error)",
            }}
          >
            Verification Failed
          </div>
          <div style={{ color: "var(--text-muted)", maxWidth: "400px" }}>
            The secret code does not match the provided image, or the image is
            not registered in the system.
          </div>
          <button
            className="btn btn-secondary"
            onClick={resetForm}
            style={{ marginTop: "16px", width: "200px" }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
