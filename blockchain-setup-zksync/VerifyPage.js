import React, { useState } from "react";
import axios from "axios";
import "../styles/VerifyPage.css";

function VerifyPage() {
  const [image, setImage] = useState(null);
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setError("");
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!image || !secretCode) {
      setError("Please provide both image and secret code");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("secretCode", secretCode);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/images/verify",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ========== NEW: Score Visualization ==========
  const renderScoreCard = () => {
    if (!result || !result.scores) return null;

    const { compositeScore, globalSimilarity, confidenceScore, individual } =
      result.scores;

    return (
      <div className="score-overview">
        <h3>📊 Advanced Scoring</h3>
        <div className="score-grid">
          <div className="score-item">
            <label>Composite Score</label>
            <div className="score-bar-container">
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${compositeScore * 100}%` }}
                />
              </div>
              <span className="score-value">
                {Math.round(compositeScore * 100)}%
              </span>
            </div>
          </div>

          <div className="score-item">
            <label>Global Similarity</label>
            <div className="score-bar-container">
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${globalSimilarity * 100}%` }}
                />
              </div>
              <span className="score-value">
                {Math.round(globalSimilarity * 100)}%
              </span>
            </div>
          </div>

          <div className="score-item">
            <label>Confidence</label>
            <div className="score-bar-container">
              <div className="score-bar">
                <div
                  className="score-fill confidence"
                  style={{ width: `${confidenceScore * 100}%` }}
                />
              </div>
              <span className="score-value">
                {Math.round(confidenceScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== CASE 1: EXACT MATCH ==========
  const renderExactMatch = () => {
    if (!result || result.imageType !== "EXACT") return null;

    return (
      <div className={`result-card result-card-${result.statusColor}`}>
        <div className="result-header">
          <span className="result-icon">{result.statusIcon}</span>
          <div className="result-title-section">
            <h3 className="result-status">{result.status}</h3>
            <p className="result-message">{result.modification.message}</p>
          </div>
        </div>

        <div className="result-content">
          <div className="modification-info">
            <div className="info-box info-box-success">
              <h4>✅ Perfect Match</h4>
              <p>{result.modification.description}</p>
              <div className="severity-bar-container">
                <div className="severity-bar">
                  <div
                    className="severity-fill severity-none"
                    style={{ width: "0%" }}
                  />
                </div>
                <p className="severity-text">
                  <strong>0% Modified • 100% Confidence</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== CASE 2: EDITED IMAGE ==========
  const renderEditedMatch = () => {
    if (!result || result.imageType !== "EDITED") return null;

    const mod = result.modification;

    return (
      <div className={`result-card result-card-${result.statusColor}`}>
        <div className="result-header">
          <span className="result-icon">{result.statusIcon}</span>
          <div className="result-title-section">
            <h3 className="result-status">{result.status}</h3>
            <p className="result-message">{mod.message}</p>
          </div>
        </div>

        <div className="result-content">
          <div className="modification-info">
            <div className="info-box info-box-warning">
              <h4>⚠️ Modifications Detected</h4>
              <p>{mod.description}</p>

              <div className="severity-bar-container">
                <div className="severity-bar">
                  <div
                    className={`severity-fill severity-${mod.severity.toLowerCase().replace("-", "-")}`}
                    style={{ width: `${mod.percentage}%` }}
                  />
                </div>
                <div className="severity-text-row">
                  <p className="severity-text">
                    <strong>{mod.percentage}% Modified</strong>
                  </p>
                  <p className="severity-level">
                    {mod.severity} • {mod.confidence}% Confidence
                  </p>
                </div>
              </div>

              <div className="severity-scale">
                <div className="scale-item">
                  <span className="scale-label">Light</span>
                  <span className="scale-value">0-15%</span>
                </div>
                <div className="scale-item">
                  <span className="scale-label">Moderate</span>
                  <span className="scale-value">15-55%</span>
                </div>
                <div className="scale-item">
                  <span className="scale-label">Heavy</span>
                  <span className="scale-value">55-100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== CASE 3: DIFFERENT IMAGE ==========
  const renderDifferentMatch = () => {
    if (!result || result.imageType !== "DIFFERENT") return null;

    const mod = result.modification;
    const scores = result.scores || {};

    return (
      <div className={`result-card result-card-${result.statusColor}`}>
        <div className="result-header">
          <span className="result-icon">{result.statusIcon}</span>
          <div className="result-title-section">
            <h3 className="result-status">{result.status}</h3>
            <p className="result-message">{mod.message}</p>
          </div>
        </div>

        <div className="result-content">
          <div className="modification-info">
            <div className="info-box info-box-error">
              <h4>❌ Verification Failed</h4>
              <p>{mod.description}</p>
              <p className="error-detail">
                Similarity too low:{" "}
                {Math.round(scores.compositeScore * 100 || 0)}%
                <br />
                Confidence: {mod.confidence || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== ENHANCED HASH COMPARISON ==========
  const renderHashDetails = () => {
    if (!result || !result.hashComparison) return null;

    const hc = result.hashComparison;

    return (
      <div className="hash-details">
        <h3>🔐 Detailed Hash Analysis</h3>
        <div className="hash-grid">
          {/* SHA256 */}
          <div
            className={`hash-item ${hc.sha256.match ? "hash-match" : "hash-mismatch"}`}
          >
            <div className="hash-header">
              <label>SHA-256</label>
              <span
                className={`hash-badge ${hc.sha256.match ? "match" : "mismatch"}`}
              >
                {hc.sha256.match ? "✅ Perfect" : "❌ Changed"}
              </span>
            </div>
            <p className="hash-description">Cryptographic file fingerprint</p>
          </div>

          {/* Perceptual Hashes */}
          {["pHash", "dHash", "aHash", "wHash"].map((hashType) => {
            const data = hc[hashType];
            return (
              <div
                key={hashType}
                className={`hash-item ${data.similar ? "hash-match" : "hash-mismatch"}`}
              >
                <div className="hash-header">
                  <label>{hashType}</label>
                  <span
                    className={`hash-badge ${data.similar ? "match" : "mismatch"}`}
                  >
                    Distance: {data.distance}
                  </span>
                </div>
                <p className="hash-description">
                  {hashType === "pHash" && "Perceptual similarity"}
                  {hashType === "dHash" && "Gradient structure"}
                  {hashType === "aHash" && "Average intensity"}
                  {hashType === "wHash" && "Wavelet frequency"}
                </p>
                <div className="hash-bar">
                  <div
                    className="hash-bar-fill"
                    style={{ width: `${Math.min(data.distance * 8, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* cropHash */}
          <div
            className={`hash-item ${hc.cropHash.similar ? "hash-match" : "hash-mismatch"}`}
          >
            <div className="hash-header">
              <label>cropHash</label>
              <span
                className={`hash-badge ${hc.cropHash.similar ? "match" : "mismatch"}`}
              >
                Distance: {hc.cropHash.distance}
              </span>
            </div>
            <p className="hash-description">4-region modification detector</p>
            <p className="hash-subtext">
              Parts: [{hc.cropHash.distances?.join(", ") || "N/A"}]
            </p>
            <div className="hash-bar">
              <div
                className="hash-bar-fill"
                style={{ width: `${Math.min(hc.cropHash.distance * 4, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* NEW: Individual Score Breakdown */}
        {result.scores?.individual && (
          <div className="score-breakdown">
            <h4>Individual Hash Contributions</h4>
            <div className="score-grid-small">
              {Object.entries(result.scores.individual).map(([key, score]) => (
                <div key={key} className="score-item-small">
                  <label>{key.toUpperCase()}</label>
                  <div className="mini-score-bar">
                    <div style={{ width: `${score * 100}%` }} />
                  </div>
                  <span>{Math.round(score * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ========== STORED RECORD INFO ==========
  const renderStoredInfo = () => {
    if (!result || !result.storedRecord) return null;

    const rec = result.storedRecord;

    return (
      <div className="stored-info">
        <h3>📋 Registration Details</h3>

        <div className="info-grid">
          <div className="info-item">
            <label>Title</label>
            <p>{rec.title}</p>
          </div>
          <div className="info-item">
            <label>Description</label>
            <p>{rec.description}</p>
          </div>
        </div>

        <div className="blockchain-section">
          <h4>🔗 Immutable Proof</h4>

          <div className="blockchain-item">
            <label>IPFS Hash</label>
            <code className="hash-code">{rec.ipfsHash}</code>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${rec.ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="blockchain-link"
            >
              📷 View Image
            </a>
          </div>

          <div className="blockchain-item">
            <label>Ethereum TX</label>
            <code className="hash-code">{rec.txHash}</code>
            <a
              href={`https://sepolia.etherscan.io/tx/${rec.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="blockchain-link"
            >
              ⛓️ View Transaction
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <div className="verify-header">
          <h2>🔍 Verify Image Authenticity</h2>
          <p className="subtitle">
            Upload image + secret code to detect if it's original, edited, or
            fake.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="verify-form">
          <div className="form-group">
            <label htmlFor="image-input">📷 Image to Verify *</label>
            <div className="file-input-wrapper">
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
                className="file-input"
              />
              <span className="file-input-label">
                {image ? `📁 ${image.name}` : "📤 Click to upload image"}
              </span>
            </div>
            {image && <p className="file-success">✅ {image.name}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="secret-code-input">🔑 Secret Code *</label>
            <input
              id="secret-code-input"
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="Enter secret code from registration"
              disabled={loading}
              className="secret-input"
            />
            <p className="input-hint">
              Provided during original image registration
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span>❌</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !image || !secretCode}
            className="submit-btn"
          >
            {loading ? (
              <>
                <span className="loader"></span>
                Analyzing...
              </>
            ) : (
              <>🚀 Verify Authenticity</>
            )}
          </button>
        </form>

        {/* ========== RESULTS ========= */}
        {result && (
          <div className="result-section">
            {renderScoreCard()} {/* NEW: Score overview */}
            {renderExactMatch()}
            {renderEditedMatch()}
            {renderDifferentMatch()}
            {renderHashDetails()}
            {renderStoredInfo()}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyPage;
