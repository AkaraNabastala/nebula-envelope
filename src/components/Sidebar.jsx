import React from 'react';
import { LayoutDashboard, FileEdit, Archive, FileText, Users, Settings, Sparkles, LogOut, Database, ShieldCheck } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, handleLogout, userRole }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'buat-surat', label: 'Surat Baru', icon: FileEdit },
    { id: 'arsip', label: 'Pusat Arsip', icon: Archive },
    ...(userRole === 'admin' ? [{ id: 'templates', label: 'Template Surat', icon: FileText }] : []),
    { id: 'master-data', label: 'Data Users', icon: Users },
    ...(userRole === 'admin' ? [{ id: 'users', label: 'Kelola Pengguna', icon: ShieldCheck }] : []),
    ...(userRole === 'admin' ? [{ id: 'backup', label: 'Backup & Restore', icon: Database }] : []),
    ...(userRole === 'admin' ? [{ id: 'pengaturan', label: 'Pengaturan Sistem', icon: Settings }] : []),
  ];

  return (
    <aside
      className={`${isOpen ? 'w-[230px]' : 'w-[50px]'} transition-all duration-300 ease-in-out bg-[#293645] text-[#b3b8c3] flex flex-col z-20 shrink-0 h-full overflow-hidden relative shadow-lg`}
    >
      {isOpen ? (
        <>
          {/* Brand / Logo Area */}
          <div className="h-14 bg-[#212b36] flex items-center px-4 shrink-0 border-b border-[#1a222b]">
            <div className="flex items-center justify-center mr-2.5">
              <Sparkles className="w-5 h-5 text-[#f39c12]" />
            </div>
            <div className="whitespace-nowrap overflow-hidden flex flex-col justify-center animate-in fade-in duration-300">
              <h1 className="font-black text-[15px] tracking-[0.15em] uppercase leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">
                NEBULA
              </h1>
              <p className="text-[#3498db] text-[7px] font-bold uppercase tracking-[0.05em] mt-0.5 max-w-[150px] truncate opacity-90">
                Melahirkan Bintang Di Semesta Digital
              </p>
            </div>
          </div>

          {/* Profil Area */}
          <div className="px-4 py-4 flex items-center border-b border-[#354353] animate-in fade-in duration-300">
            <div className="w-9 h-9 rounded-full bg-slate-300 flex shrink-0 items-center justify-center overflow-hidden border border-[#e74c3c]">
              <img src="https://ui-avatars.com/api/?name=Administrator&background=e74c3c&color=fff" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="ml-2.5 overflow-hidden whitespace-nowrap flex flex-col justify-center">
              <p className="text-white text-xs font-semibold uppercase">{userRole}</p>
              <p className="text-[#f39c12] text-[9px] mt-0.5 font-medium">{userRole === 'admin' ? 'Administrator Sistem' : 'Operator Sistem'}</p>
            </div>
          </div>

          {/* Menu List */}
          <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 transition-colors duration-200 font-medium text-xs relative
                    ${isActive
                      ? 'bg-[#1e2731] text-white'
                      : 'hover:text-white hover:bg-[#1e2731]'}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3498db]"></div>
                  )}
                  <item.icon size={16} className={`shrink-0 ${isActive ? "text-[#3498db]" : "text-[#8892a0]"}`} />
                  <span className="ml-3 tracking-wide whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Area (Logout) */}
          <div className="border-t border-[#354353] shrink-0 py-2 animate-in fade-in duration-300">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-4 py-3 transition-colors duration-200 font-medium text-xs relative text-[#e74c3c] hover:bg-[#e74c3c]/10 hover:text-[#e74c3c]`}
            >
              <LogOut size={16} className="shrink-0" />
              <span className="ml-3 tracking-wide whitespace-nowrap overflow-hidden">
                Keluar Sistem
              </span>
            </button>
          </div>
        </>
      ) : (
        /* CLOSED STATE */
        <div
          className="w-full h-full bg-[#212b36] flex flex-col items-center py-4 cursor-pointer hover:bg-[#1e2731] transition-colors"
          onClick={() => setIsOpen(true)}
          title="Buka Sidebar"
        >
          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 mb-6">
            <Sparkles className="w-5 h-5 text-[#f39c12]" />
          </div>
          <div className="flex-1 flex items-center justify-center w-full relative">
            <h1
              className="text-white font-bold text-xs tracking-[0.15em] uppercase whitespace-nowrap absolute origin-center rotate-90"
            >
              <span className="text-[#3498db]">NEBULA</span> - SISTEM PERSURATAN
            </h1>
          </div>
        </div>
      )}
    </aside>
  );
}
