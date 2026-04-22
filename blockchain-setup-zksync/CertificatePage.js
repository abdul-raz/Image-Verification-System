import React from "react";
import "../styles/CertificatePage.css";

function CertificatePage({ data, onBack }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const downloadJSON = () => {
    const element = document.createElement("a");
    element.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    element.download = "certificate.json";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="certificate-container">
      <div className="certificate-card">
        <h2>✅ Image Registered Successfully!</h2>

        <div className="warning">
          ⚠️ <strong>IMPORTANT:</strong> Save your Secret Code somewhere safe.
          You'll need it to prove ownership!
        </div>

        <div className="section">
          <h3>Secret Code (Save This!)</h3>
          <div className="secret-code-box">
            <code>{data.privacy.secretCode}</code>
            <button
              onClick={() => copyToClipboard(data.privacy.secretCode)}
              className="copy-btn"
            >
              📋 Copy
            </button>
          </div>
        </div>

        <div className="section">
          <h3>Hashes</h3>
          <div className="hash-grid">
            <div className="hash-item">
              <label>SHA-256 (Exact Match)</label>
              <code>{data.hashes.sha256.substring(0, 32)}...</code>
            </div>
            <div className="hash-item">
              <label>pHash (Structure)</label>
              <code>{data.hashes.pHash}</code>
            </div>
            <div className="hash-item">
              <label>dHash (Gradient)</label>
              <code>{data.hashes.dHash}</code>
            </div>
            <div className="hash-item">
              <label>aHash (Average)</label>
              <code>{data.hashes.aHash}</code>
            </div>
            <div className="hash-item">
              <label>wHash (Wavelet)</label>
              <code>{data.hashes.wHash}</code>
            </div>
            <div className="hash-item">
              <label>cropHash (Crop-Resistant)</label>
              <code>{data.hashes.cropHash}</code>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Privacy Protection</h3>
          <div className="privacy-info">
            <p>
              <strong>Creator Hash:</strong>{" "}
              {data.privacy.creatorHash.substring(0, 32)}...
            </p>
            <p>
              <em>Your identity is protected. Email never stored in plain.</em>
            </p>
          </div>
        </div>

        <div className="section">
          <h3>Decentralized Storage (IPFS)</h3>
          <p>
            IPFS Hash: <code>{data.ipfs.hash}</code>
          </p>
          <a
            href={`https://gateway.pinata.cloud/ipfs/${data.ipfs.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn"
          >
            🔗 View on IPFS
          </a>
        </div>

        <div className="section">
          <h3>Blockchain Registration</h3>
          <p>
            TX Hash: <code>{data.blockchain.txHash.substring(0, 32)}...</code>
          </p>
          <p>Block: {data.blockchain.blockNumber}</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${data.blockchain.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn"
          >
            🔗 View on Sepolia Explorer
          </a>
        </div>

        <div className="section">
          <h3>Database Information</h3>
          <p>
            Image ID: <strong>{data.database.imageId}</strong>
          </p>
          <p>
            Creator ID: <strong>{data.database.creatorId}</strong>
          </p>
        </div>

        <div className="buttons">
          <button onClick={downloadJSON} className="download-btn">
            📥 Download Certificate (JSON)
          </button>
          <button onClick={onBack} className="back-btn">
            ↩️ Register Another Image
          </button>
        </div>
      </div>
    </div>
  );
}

export default CertificatePage;
