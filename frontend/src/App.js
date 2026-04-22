import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// We will create these pages next
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
import ProveOwnership from "./pages/ProveOwnerShip";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="register" element={<Register />} />
          <Route path="verify" element={<Verify />} />
          <Route path="prove-ownership" element={<ProveOwnership />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
