import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault(); // Mencegah reload halaman standar browser
    
    // Logika simulasi login sederhana: langsung pindah ke dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-300 flex items-center justify-center p-4 sm:p-8">
      
      {/* Container Utama */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex w-full max-w-5xl border border-white/50">
        
        {/* Bagian Kiri: Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-slate-500 font-medium">
              Sistem Manajemen Surat Terpadu
            </p>
          </div>

          {/* Form Login */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email / NIP Pengguna
              </label>
              <input 
                type="text" 
                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200"
                placeholder="Masukkan email atau NIP"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Kata Sandi
              </label>
              <input 
                type="password" 
                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 transition-all" 
                />
                <span className="text-sm font-medium text-slate-600">Ingat sesi saya</span>
              </label>
              <a href="#" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Lupa sandi?
              </a>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] duration-200 mt-4"
            >
              Masuk ke Sistem
            </button>
          </form>

          {/* Footer Form */}
          <div className="mt-10 text-center">
            <p className="text-xs text-slate-400 font-medium">
              © 2026 E-Surat Platform. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>

        {/* Bagian Kanan: Visual (Otomatis disembunyikan di layar kecil) */}
        <div className="hidden lg:flex w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 mt-12">
            <h3 className="text-4xl font-bold text-white mb-6 leading-tight">
              Birokrasi Cepat,<br/>Tanpa Batas.
            </h3>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md">
              Platform persuratan digital yang dirancang khusus untuk fleksibilitas, keamanan tingkat tinggi, dan kemudahan kolaborasi antar instansi.
            </p>
          </div>
          
          {/* Ornamen Background (Glow Effects) */}
          <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-60"></div>
          <div className="absolute top-10 -left-20 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-40"></div>
          
          <div className="relative z-10 mb-8">
            <div className="flex items-center space-x-4 text-slate-300">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md">
                ✓
              </span>
              <span className="font-medium text-sm">Terinkripsi & Aman</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}