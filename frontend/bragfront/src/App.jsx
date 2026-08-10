import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';

// ─────────────────────────────────────────────
// PAGE & COMPONENT IMPORTS
// ─────────────────────────────────────────────

// Public (unauthenticated) pages
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';

// Shared layout wrapper for all protected pages (contains sidebar, header, nav)
import Layout from './components/Layout';

// Protected pages rendered inside the Layout
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import DepartmentFeed from './pages/DepartmentFeed';
import ShoutoutPage from './pages/ShoutoutPage';
import AdminDashboard from './pages/AdminDashboard';
import Leaderboard from './pages/Leaderboard';

import './App.css';

/**
 * App
 * Root component of the BragBoard frontend.
 * Sets up:
 *   - ToastProvider: global toast notification system (wraps everything)
 *   - BrowserRouter: client-side routing via React Router
 *   - Route structure: public routes + protected routes inside Layout
 */
function App() {
  return (
    // ToastProvider wraps the whole app so any component can trigger toast notifications
    <ToastProvider>
      <Router>
        <div className="App theme-deep-nebula min-h-screen text-slate-100">
          <Routes>
            {/* ── PUBLIC ROUTES ── */}
            {/* These pages are accessible without logging in */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ── PROTECTED ROUTES ── */}
            {/* All routes inside Layout are protected — Layout handles auth check */}
            {/* Layout renders the sidebar + header, and Outlet shows the child page */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />            {/* Main feed with brags */}
              <Route path="/profile" element={<Profile />} />                {/* Current user's profile page */}
              <Route path="/department-feed" element={<DepartmentFeed />} /> {/* Department-specific brag feed */}
              <Route path="/shoutouts" element={<ShoutoutPage />} />         {/* Public shoutout feed */}
              <Route path="/leaderboard" element={<Leaderboard />} />        {/* Points-based leaderboard */}
              <Route path="/admin" element={<AdminDashboard />} />           {/* Admin-only dashboard */}
            </Route>

            {/* Default redirect: visiting "/" sends user to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
