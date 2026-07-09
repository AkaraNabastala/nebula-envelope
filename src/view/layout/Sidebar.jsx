import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation(); // Untuk mendeteksi halaman saat ini

  const handleLogout = () => {
    navigate('/login');
  };

  // Fungsi utilitas untuk mengecek apakah menu sedang aktif
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0 border-r border-slate-800">
      
      {/* HEADER SIDEBAR */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800/60 bg-slate-900/50">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg mr-3">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">NABASTALA</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Sistem Arsip</p>
        </div>
      </div>
      
      {/* MENU NAVIGASI */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Menu Utama</p>
        
        <Link 
          to="/dashboard" 
          className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive('/dashboard') ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-slate-100'}`}
        >
          <svg className={`w-5 h-5 ${isActive('/dashboard') ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-sm font-semibold">Dasbor Ringkasan</span>
        </Link>
        
        <Link 
          to="/surat-masuk" 
          className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive('/surat-masuk') ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-slate-100'}`}
        >
          <svg className={`w-5 h-5 ${isActive('/surat-masuk') ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold">Surat Masuk</span>
        </Link>
        
        <Link 
          to="/surat-keluar" 
          className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive('/surat-keluar') ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-slate-100'}`}
        >
          <svg className={`w-5 h-5 ${isActive('/surat-keluar') ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span className="text-sm font-semibold">Surat Keluar</span>
        </Link>
        
        {/* SEPARATOR */}
        <div className="pt-6 mt-4 border-t border-slate-800/60">
          <p className="px-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Pengaturan Data</p>
          
          <Link 
            to="/data-entitas" 
            className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive('/data-entitas') ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <svg className={`w-5 h-5 ${isActive('/data-entitas') ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm font-semibold">Database Entitas</span>
          </Link>
          
          <Link 
            to="/template-surat" 
            className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive('/template-surat') ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <svg className={`w-5 h-5 ${isActive('/template-surat') ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-semibold">Template Surat</span>
          </Link>
        </div>
      </nav>

      {/* FOOTER SIDEBAR */}
      <div className="p-5 border-t border-slate-800/60 bg-slate-900/30">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 font-bold text-sm group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Keluar Sistem</span>
        </button>
      </div>
    </aside>
  );
}