import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // State untuk menyimpan angka-angka dari database
  const [stats, setStats] = useState({
    totalArsip: 0,
    totalSuratKeluar: 0,
    totalSuratMasuk: 0,
    totalEntitas: 0,
    logTerbaru: []
  });

  // Fungsi untuk menarik data dari SQLite
  const muatStatistik = async () => {
    try {
      if (window.api && window.api.getDashboardStats) {
        const data = await window.api.getDashboardStats();
        setStats(data);
      }
    } catch (error) {
      console.error("Gagal memuat statistik dasbor:", error);
    }
  };

  useEffect(() => {
    // Jalankan animasi dan muat data secara bersamaan
    const timer = setTimeout(() => setIsLoaded(true), 100);
    muatStatistik();
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>
        {`
          .fade-in-up {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .fade-in-up.active {
            opacity: 1;
            transform: translateY(0);
          }
          .delay-100 { transition-delay: 100ms; }
          .delay-200 { transition-delay: 200ms; }
          .delay-300 { transition-delay: 300ms; }
          .delay-400 { transition-delay: 400ms; }
        `}
      </style>

      <div className="max-w-7xl mx-auto w-full">
        
        {/* Sambutan Cepat */}
        <div className={`mb-8 fade-in-up ${isLoaded ? 'active' : ''}`}>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Tinjauan Sistem</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Ringkasan aktivitas arsip dan statistik institusi Anda secara luring.</p>
        </div>

        {/* Baris 1: Kartu Statistik Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          
          {/* Kartu 1: Total Arsip */}
          <div className={`bg-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_8px_30px_-12px_rgba(79,70,229,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group fade-in-up delay-100 ${isLoaded ? 'active' : ''}`}>
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[13px] text-slate-500 font-bold uppercase tracking-wider mb-2">Total Arsip</p>
                <p className="text-3xl font-extrabold text-slate-800">{stats.totalArsip}</p>
                <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center">
                  Dokumen dalam sistem
                </p>
              </div>
              <div className="p-3 bg-indigo-100/50 rounded-2xl text-indigo-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </div>
            </div>
          </div>
          
          {/* Kartu 2: Surat Keluar */}
          <div className={`bg-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_8px_30px_-12px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group fade-in-up delay-200 ${isLoaded ? 'active' : ''}`}>
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[13px] text-slate-500 font-bold uppercase tracking-wider mb-2">Surat Keluar</p>
                <p className="text-3xl font-extrabold text-slate-800">{stats.totalSuratKeluar}</p>
                <p className="text-xs text-slate-400 font-semibold mt-2">Total diterbitkan</p>
              </div>
              <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600">
                <svg className="w-6 h-6 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </div>
            </div>
          </div>
          
          {/* Kartu 3: Surat Masuk */}
          <div className={`bg-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_8px_30px_-12px_rgba(245,158,11,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group fade-in-up delay-300 ${isLoaded ? 'active' : ''}`}>
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-amber-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[13px] text-slate-500 font-bold uppercase tracking-wider mb-2">Surat Masuk</p>
                <p className="text-3xl font-extrabold text-slate-800">{stats.totalSuratMasuk}</p>
                <p className="text-xs text-amber-500 font-bold mt-2">Total diterima</p>
              </div>
              <div className="p-3 bg-amber-100/50 rounded-2xl text-amber-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>

          {/* Kartu 4: Entitas Aktif */}
          <div className={`bg-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_8px_30px_-12px_rgba(139,92,246,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group fade-in-up delay-400 ${isLoaded ? 'active' : ''}`}>
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[13px] text-slate-500 font-bold uppercase tracking-wider mb-2">Data Entitas</p>
                <p className="text-3xl font-extrabold text-slate-800">{stats.totalEntitas}</p>
                <p className="text-xs text-slate-400 font-semibold mt-2">Karyawan & Mitra aktif</p>
              </div>
              <div className="p-3 bg-purple-100/50 rounded-2xl text-purple-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Baris 2: Aktivitas Terakhir */}
        <div className={`bg-white rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden fade-in-up delay-400 ${isLoaded ? 'active' : ''}`}>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-transparent">
            <h3 className="text-lg font-bold text-slate-800">Log Aktivitas Terbaru</h3>
            <button 
              onClick={() => muatStatistik()}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center"
            >
              Segarkan Data
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="p-5 border-b border-slate-100">Tipe Surat</th>
                  <th className="p-5 border-b border-slate-100">Nomor Registrasi</th>
                  <th className="p-5 border-b border-slate-100">Perihal Dokumen</th>
                  <th className="p-5 border-b border-slate-100">Relasi Terkait</th>
                  <th className="p-5 border-b border-slate-100 text-right">Tanggal Rekam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                
                {stats.logTerbaru.map((log, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        log.tipe_surat === 'Masuk' 
                          ? 'bg-amber-50 text-amber-600 border-amber-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {log.tipe_surat}
                      </span>
                    </td>
                    <td className="p-5 font-bold text-slate-800">{log.nomor_surat}</td>
                    <td className="p-5 font-medium text-slate-600">{log.judul_surat}</td>
                    <td className="p-5 text-slate-500">{log.nama_entitas || '—'}</td>
                    <td className="p-5 text-slate-500 text-right font-medium">{log.tanggal}</td>
                  </tr>
                ))}

                {stats.logTerbaru.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400 font-medium text-sm">
                      Belum ada aktivitas arsip yang terekam.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}