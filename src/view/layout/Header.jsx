import React from 'react';

export default function Header() {
  return (
    <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-8 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] shrink-0 sticky top-0 z-10">
      
      {/* Area Kiri: Breadcrumb / Judul */}
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Ruang Kerja</h2>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-500">Tinjauan Utama</span>
      </div>
      
      {/* Area Kanan: Profil & Notifikasi */}
      <div className="flex items-center space-x-6">
        
        {/* Tombol Notifikasi */}
        <button className="relative text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-slate-100">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        {/* Garis Pemisah */}
        <div className="h-8 w-px bg-slate-200"></div>

        {/* Profil Pengguna */}
        <div className="flex items-center space-x-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Wicha Mahardicha</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Super Administrator</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            W
          </div>
        </div>
        
      </div>
    </header>
  );
}