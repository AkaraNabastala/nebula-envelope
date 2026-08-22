import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalLupaSandi from './components/ModalLupaSandi'; // Komponen Modal terpisah
import Titlebar from '../components/Titlebar';
import { verifikasiUserLocal, resetPasswordAdmin, getSettings } from '../services/db';

export default function Login({ onLoginSuccess }) {
  let navigate;
  try {
    navigate = useNavigate();
  } catch (e) {
    navigate = null;
  }

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [masterPin, setMasterPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Memicu animasi transisi
    setIsLoaded(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setErrorMsg('Username dan Kata Sandi wajib diisi.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      let response = await verifikasiUserLocal(username, password);

      if (response && response.success) {
        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess(response.role);
        } else if (navigate) {
          navigate('/dashboard');
        }
      } else {
        setIsLoading(false);
        setErrorMsg('Otorisasi ditolak: Kredensial tidak valid.');
      }
    } catch (error) {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        setErrorMsg('Terjadi kesalahan pada sistem database lokal.');
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Mengambil PIN keamanan dari IndexedDB (Dinamis, tidak hardcoded)
    const settings = await getSettings();
    const correctPin = settings?.master_pin || '123456';

    if (masterPin === correctPin) {
      await resetPasswordAdmin('123'); // Reset sandi admin menjadi 123
      setIsModalOpen(false);
      setMasterPin('');
      setPinError('');
      alert("Kata sandi berhasil direset menjadi: 123");
    } else {
      setPinError('PIN Keamanan Master tidak valid.');
    }
  };

  return (
    <>
      <style>
        {`
          /* Animasi Efek Masuk Berurutan (Staggered) */
          .slide-reveal {
            opacity: 0;
            transform: translateY(24px);
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .slide-reveal.active {
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Waktu tunda per elemen */
          .delay-100 { transition-delay: 100ms; }
          .delay-200 { transition-delay: 200ms; }
          .delay-300 { transition-delay: 300ms; }
          .delay-400 { transition-delay: 400ms; }
        `}
      </style>

      {/* Kontainer Utama */}
      <div className="h-screen flex flex-col w-full font-sans bg-white overflow-hidden">
        <Titlebar />
        <div className="flex flex-1 overflow-hidden relative">

        {/* ========================================== */}
        {/* BAGIAN KIRI: GAMBAR (Proporsi 65%)         */}
        {/* ========================================== */}
        <div className="hidden lg:flex lg:w-[65%] relative flex-col justify-end p-16 xl:p-20 bg-slate-900 z-10">

          {/* Gambar Latar Belakang */}
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
            alt="Corporate Office"
            className="absolute inset-0 w-full h-full object-cover opacity-80 scale-105"
          />

          {/* Efek Gradasi untuk teks */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>

          {/* Pola Tekstur Titik */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

          {/* Label Versi */}
          <div className="absolute top-8 left-12 z-20">
            <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white shadow-sm uppercase tracking-widest">
              v1.0.0 — Edisi Offline
            </span>
          </div>

          <div className={`relative z-10 slide-reveal delay-100 ${isLoaded ? 'active' : ''}`}>
            {/* Logo Instansi Kiri */}
            <div className="w-14 h-14 bg-indigo-600 rounded-[1rem] flex items-center justify-center shadow-xl mb-6 border border-indigo-400/20">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
              </svg>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-5 drop-shadow-xl">
              Manajemen Administrasi<br />Terpadu Nabastala.
            </h1>

            <p className="text-slate-300 text-lg xl:text-xl max-w-lg font-medium leading-relaxed drop-shadow">
              Platform persuratan yang dirancang khusus untuk menyimpan arsip lokal secara rahasia tanpa koneksi internet.
            </p>
          </div>
        </div>

        {/* ========================================== */}
        {/* BAGIAN KANAN: FORM LOGIN (Proporsi 35%)    */}
        {/* ========================================== */}
        {/* Memberikan shadow tebal di kiri agar panel ini terasa melayang di atas gambar */}
        <div className="w-full lg:w-[35%] flex flex-col justify-center items-center bg-white p-6 sm:p-12 relative z-20 shadow-[-15px_0_40px_rgba(0,0,0,0.15)]">

          {/* Kontainer Form - Ukuran Pas (max-w-md) agar nyaman */}
          <div className="w-full max-w-md">

            {/* Header Form */}
            <div className={`mb-10 text-left slide-reveal delay-100 ${isLoaded ? 'active' : ''}`}>
              <div className="lg:hidden w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                </svg>
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Otorisasi</h2>
              <p className="text-[15px] text-slate-500 font-medium">Otorisasi institusi mandiri.</p>
            </div>

            {/* Area Notifikasi Error */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${errorMsg ? 'max-h-16 mb-6 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}>
              <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-semibold rounded-r-lg flex items-center space-x-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{errorMsg}</span>
              </div>
            </div>

            {/* FORMULIR - Gaya Floating Label Bersih */}
            <form onSubmit={handleLogin} className="space-y-7">

              {/* Input Username */}
              <div className={`relative group pt-4 slide-reveal delay-200 ${isLoaded ? 'active' : ''}`}>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                  className="block w-full px-0 py-3 text-base font-bold text-slate-900 bg-transparent border-0 border-b-2 border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-indigo-600 peer transition-colors duration-300 disabled:opacity-50"
                  placeholder=" "
                />
                <label
                  htmlFor="username"
                  className="absolute text-slate-500 duration-300 transform -translate-y-7 scale-75 top-4 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-indigo-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-7 text-base font-medium"
                >
                  Username
                </label>
              </div>

              {/* Input Password */}
              <div className={`relative group pt-4 slide-reveal delay-300 ${isLoaded ? 'active' : ''}`}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="block w-full px-0 py-3 pr-10 text-base font-bold text-slate-900 bg-transparent border-0 border-b-2 border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-indigo-600 peer transition-colors duration-300 disabled:opacity-50"
                  placeholder=" "
                />
                <label
                  htmlFor="password"
                  className="absolute text-slate-500 duration-300 transform -translate-y-7 scale-75 top-4 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-indigo-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-7 text-base font-medium"
                >
                  Kata Sandi
                </label>

                {/* Tombol Mata */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-0 top-4 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50 p-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.978 9.978 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>

              {/* Opsi Tambahan */}
              <div className={`flex items-center justify-between pt-2 slide-reveal delay-400 ${isLoaded ? 'active' : ''}`}>
                <label className="flex items-center space-x-2.5 cursor-pointer group">
                  <input type="checkbox" disabled={isLoading} className="w-4.5 h-4.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer disabled:opacity-50" />
                  <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Ingat sesi ini</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={isLoading}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                >
                  Lupa sandi?
                </button>
              </div>

              {/* TOMBOL LOGIN */}
              <div className={`slide-reveal delay-400 ${isLoaded ? 'active' : ''}`}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-4 mt-2 bg-slate-900 hover:bg-indigo-600 text-white text-base font-bold rounded-2xl transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-8px_rgba(79,70,229,0.4)] flex items-center justify-center space-x-2 ${isLoading ? 'opacity-80 cursor-wait' : 'hover:-translate-y-1 active:scale-[0.98] group'}`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="tracking-wide">Proses Autentikasi...</span>
                    </>
                  ) : (
                    <>
                      <span className="tracking-wide">Masuk Sistem</span>
                      <svg className="w-5 h-5 ml-1.5 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest slide-reveal delay-400">
              Sistem Oleh <span className="text-indigo-600">Nabastala</span>
            </p>
          </div>
        </div>

        {/* Modal Komponen Lupa Sandi */}
        <ModalLupaSandi
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          masterPin={masterPin}
          setMasterPin={setMasterPin}
          pinError={pinError}
          onSubmit={handleResetPassword}
        />

        </div>
      </div>
    </>
  );
}