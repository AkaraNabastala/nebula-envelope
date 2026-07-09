import React from 'react';

export default function ModalLupaSandi({ isOpen, onClose, masterPin, setMasterPin, pinError, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Latar Belakang Blur Hitam Elegan */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Kontainer Modal */}
      <div 
        className="relative bg-white/95 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-[2rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transform transition-all duration-300"
        style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 bg-slate-100/50 hover:bg-slate-200 p-2 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6 mt-2 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Otorisasi PIN Master</h3>
          <p className="text-sm text-slate-500 font-medium">Sistem berjalan luring. Masukkan PIN keamanan untuk modifikasi sandi.</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="mb-6">
            <input 
              type="password" 
              value={masterPin}
              onChange={(e) => setMasterPin(e.target.value)}
              placeholder="••••••"
              className={`w-full px-4 py-4 text-center tracking-[1em] font-mono text-xl text-slate-900 rounded-xl bg-slate-50 border-2 ${pinError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-indigo-600'} focus:bg-white focus:outline-none transition-all shadow-inner`}
              maxLength={6}
              autoFocus
            />
            <div className={`overflow-hidden transition-all duration-300 ${pinError ? 'max-h-8 mt-2' : 'max-h-0 mt-0'}`}>
              <p className="text-red-500 text-[12px] text-center font-bold">{pinError}</p>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:-translate-y-0.5 active:scale-[0.98]">
            Verifikasi Protokol
          </button>
        </form>
      </div>
    </div>
  );
}