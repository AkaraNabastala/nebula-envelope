import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import LogoNebula from '../assets/logonebula.png';

export default function Titlebar({ settings }) {
  return (
    <div 
      className="h-8 w-full bg-slate-900 flex items-center justify-between shrink-0 select-none z-[100] relative"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Kiri: Judul / Logo */}
      <div className="flex items-center px-4 gap-2 text-slate-400">
        <img 
          src={settings?.logo_base64 || LogoNebula} 
          alt="Logo" 
          className="w-4 h-4 object-contain"
        />
        <span className="text-[11px] font-bold tracking-widest uppercase">
          Nebula Envelope
        </span>
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
