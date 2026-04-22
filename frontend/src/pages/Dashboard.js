import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("l1"); // 'l1' or 'l2'

  return (
    <div className="dashboard-container">
      {/* ── HERO SECTION ── */}
      <div className="hero-section">
        <div className="hero-content">
          <div
            className="badge badge-success"
            style={{ marginBottom: "var(--s4)" }}
          >
            <div className="dot"></div>
            SYSTEM LIVE
          </div>
          <h1 className="hero-title">
            Decentralized Copyright
            <br />
            Protection System
          </h1>
          <p className="hero-subtitle">
            HashGuard combines advanced cryptographic perceptual hashing with
            immutable blockchain registries to prove original image ownership
            securely.
          </p>
          <div className="hero-buttons">
            <NavLink
              to="/register"
              className="btn btn-primary glow"
              style={{
                width: "auto",
                textDecoration: "none",
                padding: "0 24px",
                height: "48px",
              }}
            >
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
              </svg>
              Register Asset
            </NavLink>
            <NavLink
              to="/verify"
              className="btn btn-secondary"
              style={{
                width: "auto",
                textDecoration: "none",
                padding: "0 24px",
                height: "48px",
              }}
            >
              Verify Asset
            </NavLink>
          </div>
        </div>
      </div>

      {/* ── SYSTEM FLOW ── */}
      <div className="section-title-wrapper">
        <h2 className="section-title">How HashGuard Works</h2>
        <div className="section-desc">
          A cryptographically secure, four-step anchoring process.
        </div>
      </div>

      <div className="flow-grid">
        <div className="flow-step-card">
          <div className="step-number">1</div>
          <div className="step-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h3 className="step-title">Perceptual Hashing</h3>
          <p className="step-desc">
            Image is analyzed locally using 6 different hashing algorithms to
            create a unique cryptographic fingerprint resistant to cropping or
            filters.
          </p>
        </div>

        <div className="flow-step-card">
          <div className="step-number">2</div>
          <div className="step-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h3 className="step-title">IPFS Pinning</h3>
          <p className="step-desc">
            The original file is uploaded to the InterPlanetary File System
            (IPFS) via Pinata, ensuring decentralized and tamper-proof storage.
          </p>
        </div>

        <div className="flow-step-card">
          <div className="step-number">3</div>
          <div className="step-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 className="step-title">On-Chain Anchoring</h3>
          <p className="step-desc">
            The perceptual hashes and IPFS CID are bundled into a smart contract
            transaction and permanently minted to Ethereum L1 or zkSync L2.
          </p>
        </div>

        <div className="flow-step-card">
          <div className="step-number">4</div>
          <div className="step-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="step-title">Secret Key Delivery</h3>
          <p className="step-desc">
            The creator receives a one-time cryptographic Secret Code required
            to generate ownership certificates and prove original authorship.
          </p>
        </div>
      </div>

      {/* ── L1 vs L2 COMPARISON ── */}
      <div className="section-title-wrapper" style={{ marginTop: "var(--s4)" }}>
        <h2 className="section-title">Network Architecture</h2>
        <div className="section-desc">
          HashGuard supports dual-network anchoring depending on security and
          cost requirements.
        </div>
      </div>

      <div className="network-compare-container">
        {/* Network Toggle for Mobile/Small screens */}
        <div className="network-tabs">
          <button
            className={`net-tab ${activeTab === "l1" ? "active-eth" : ""}`}
            onClick={() => setActiveTab("l1")}
          >
            Ethereum (L1)
          </button>
          <button
            className={`net-tab ${activeTab === "l2" ? "active-zk" : ""}`}
            onClick={() => setActiveTab("l2")}
          >
            zkSync Era (L2)
          </button>
        </div>

        <div className="compare-grid">
          {/* ETHEREUM L1 CARD */}
          <div
            className={`compare-card card-eth ${activeTab !== "l1" ? "hide-on-mobile" : ""}`}
          >
            <div className="compare-header">
              <div className="compare-icon icon-eth">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <h3 className="compare-title">Ethereum Mainnet</h3>
              <div className="badge badge-eth">MAX SECURITY</div>
            </div>

            <p className="compare-desc">
              The foundational layer of Web3. Ideal for high-value enterprise
              assets where maximum decentralization and unquestionable security
              are required.
            </p>

            <div className="data-list">
              <div className="data-row">
                <span className="data-label">Avg. Gas Fee</span>
                <span className="data-value" style={{ color: "var(--error)" }}>
                  $2.50 - $15.00+
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Confirmation Time</span>
                <span className="data-value">~12 to 15 seconds</span>
              </div>
              <div className="data-row">
                <span className="data-label">Data Availability</span>
                <span className="data-value">Full L1 Node Storage</span>
              </div>
              <div className="data-row">
                <span className="data-label">Best Use Case</span>
                <span className="data-value">Corporate Copyrights</span>
              </div>
            </div>
          </div>

          {/* ZKSYNC L2 CARD */}
          <div
            className={`compare-card card-zk ${activeTab !== "l2" ? "hide-on-mobile" : ""}`}
          >
            <div className="compare-header">
              <div className="compare-icon icon-purple">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="compare-title">zkSync Era Rollup</h3>
              <div className="badge badge-zk">HIGH PERFORMANCE</div>
            </div>

            <p className="compare-desc">
              A Zero-Knowledge (ZK) rollup scaling solution. It batches
              transactions off-chain and posts cryptographic proofs to L1,
              offering extremely cheap fees.
            </p>

            <div className="data-list">
              <div className="data-row">
                <span className="data-label">Avg. Gas Fee</span>
                <span
                  className="data-value"
                  style={{ color: "var(--success)" }}
                >
                  $0.01 - $0.05
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Confirmation Time</span>
                <span
                  className="data-value"
                  style={{ color: "var(--success)" }}
                >
                  ~1 to 3 seconds
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Data Availability</span>
                <span className="data-value">State Diffs on L1</span>
              </div>
              <div className="data-row">
                <span className="data-label">Best Use Case</span>
                <span className="data-value">Independent Creators</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
