import React from 'react';
import { Menu } from 'lucide-react';

export default function Header({ toggleSidebar, settings }) {
  return (
    <header className="h-16 bg-[#354353] flex items-center justify-between px-4 shrink-0 z-10 shadow-sm border-b border-[#293645]">

      {/* Kiri: Toggle Sidebar & Judul */}
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center text-[#b3b8c3] hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

    </header>
  );
}
