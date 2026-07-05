import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import komponen halaman
import Login from './view/Login';
import Dashboard from './view/pages/Dashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect otomatis dari root ("/") ke "/login" */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rute Halaman */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}