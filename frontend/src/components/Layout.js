import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./Layout.css";

// Reusable SVG Icons
const DashboardIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const RegisterIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const VerifyIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const OwnershipIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const Layout = () => {
  return (
    <div className="app-container">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00c8d7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <span className="sidebar-logo-text">
            Hash<span>Guard</span>
          </span>
        </div>

        {/* Navigation Links */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <DashboardIcon />
          Dashboard
        </NavLink>
        <NavLink
          to="/register"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <RegisterIcon />
          Register Image
        </NavLink>
        <NavLink
          to="/verify"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <VerifyIcon />
          Verify Image
        </NavLink>
        <NavLink
          to="/prove-ownership"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <OwnershipIcon />
          Prove Ownership
        </NavLink>

        {/* Network Status Indicator (Bottom of sidebar) */}
        <div
          style={{
            marginTop: "auto",
            padding: "16px",
            background: "var(--surface-2)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            Network Status
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--success)",
                boxShadow: "0 0 8px var(--success)",
              }}
            ></div>
            System Online
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <div className="main-scroll-area">
          <Outlet /> {/* Child pages render here */}
        </div>
      </main>
    </div>
  );
};

export default Layout;
