import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Arahkan kembali ke halaman login
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Kiri */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-xl font-bold text-white tracking-wider">E-SURAT</h1>
          <p className="text-xs text-slate-400 mt-1">Panel Administrasi</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="block px-4 py-3 rounded-lg bg-indigo-600/10 text-indigo-400 font-medium border border-indigo-500/20">
            Dashboard Utama
          </a>
          <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Surat Masuk
          </a>
          <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Surat Keluar
          </a>
          <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            Manajemen Pengguna
          </a>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-medium text-sm border border-red-500/20"
          >
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Area Konten Kanan */}
      <main className="flex-1 flex flex-col">
        {/* Header (Top Bar) */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Ringkasan Hari Ini</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600">Halo, Administrator</span>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
              A
            </div>
          </div>
        </header>

        {/* Isi Konten (Widget/Kartu Statistik) */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-sm text-slate-500 font-medium">Surat Belum Dibaca</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">12</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-sm text-slate-500 font-medium">Surat Selesai Diproses</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">148</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-sm text-slate-500 font-medium">Menunggu Disposisi</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">5</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}