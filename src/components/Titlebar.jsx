import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function Titlebar() {
  return (
    <div 
      className="h-8 w-full bg-slate-900 flex items-center justify-between shrink-0 select-none z-[100] relative"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Kiri: Judul / Logo */}
      <div className="flex items-center px-4 gap-2 text-slate-400">
        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
        </svg>
        <span className="text-[11px] font-bold tracking-widest uppercase">Sistem Surat Universal</span>
      </div>

      {/* Kanan: Kontrol Window */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <button 
          onClick={() => window.api?.minimize()}
          className="h-full px-4 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => window.api?.maximize()}
          className="h-full px-4 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={() => window.api?.close()}
          className="h-full px-4 text-slate-400 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
