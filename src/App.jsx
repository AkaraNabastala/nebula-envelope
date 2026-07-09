import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Komponen
import Login from './view/Login';
import MainLayout from './view/layout/MainLayout';
import Dashboard from './view/pages/Dashboard';
import SuratMasuk from './view/pages/SuratMasuk';
import SuratKeluar from './view/pages/SuratKeluar';
import DataEntitas from './view/pages/DataEntitas';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rute Standalone (Tanpa Sidebar/Header) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rute dengan Layout Terpusat */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data-entitas" element={<DataEntitas />} />
          <Route path="/surat-masuk" element={<SuratMasuk />} />
          <Route path="/surat-keluar" element={<SuratKeluar />} />
        </Route>
      </Routes>
    </Router>
  );
}