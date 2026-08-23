import React from 'react';
import { LayoutDashboard, FileEdit, Archive, FileText, Users, Settings, LogOut, Database, ShieldCheck } from 'lucide-react';
import LogoNebula from '../assets/logonebula.png';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, handleLogout, userRole, namaLengkap, settings }) {
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
      className={`${isOpen ? 'w-[280px]' : 'w-[60px]'} transition-all duration-300 ease-in-out bg-[#293645] text-[#b3b8c3] flex flex-col z-20 shrink-0 h-full relative shadow-lg`}
    >
      {isOpen ? (
        <>
          {/* Brand / Logo Area */}
          <div className="h-16 bg-[#212b36] flex items-center px-4 shrink-0 border-b border-[#1a222b]">
            <div className="flex items-center justify-center mr-2.5">
              <img 
                src={settings?.logo_base64 || LogoNebula} 
                alt="Logo" 
                className="w-7 h-7 object-contain drop-shadow-md" 
              />
            </div>
            <div className="flex flex-col justify-center animate-in fade-in duration-300 w-full pr-2">
              <h1 className="font-black text-xs tracking-widest uppercase leading-snug text-white drop-shadow-sm line-clamp-2">
                {settings?.nama_instansi || 'Sistem Persuratan'}
              </h1>
            </div>
          </div>

          {/* Profil Area */}
          <div className="px-4 py-4 flex items-center border-b border-[#354353] animate-in fade-in duration-300">
            <div className="w-9 h-9 rounded-full bg-slate-300 flex shrink-0 items-center justify-center overflow-hidden border border-[#e74c3c]">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(namaLengkap || userRole)}&background=e74c3c&color=fff`} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="ml-2.5 overflow-hidden whitespace-nowrap flex flex-col justify-center">
              <p className="text-white text-xs font-black uppercase tracking-widest">{namaLengkap || userRole}</p>
              <p className="text-[#f39c12] text-[9px] mt-0.5 font-bold uppercase tracking-wider">{userRole === 'admin' ? 'Administrator Sistem' : 'Operator Sistem'}</p>
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
                  className={`w-full flex items-center px-5 py-4 transition-colors duration-200 font-bold text-[10px] uppercase tracking-widest relative
                    ${isActive
                      ? 'bg-[#1e2731] text-white'
                      : 'hover:text-white hover:bg-[#1e2731]'}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3498db]"></div>
                  )}
                  <item.icon size={18} className={`shrink-0 ${isActive ? "text-[#3498db]" : "text-[#8892a0]"}`} />
                  <span className="ml-4 truncate">
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
              className={`w-full flex items-center px-5 py-4 transition-colors duration-200 font-bold text-[10px] uppercase tracking-widest relative text-[#e74c3c] hover:bg-[#e74c3c]/10 hover:text-[#e74c3c]`}
            >
              <LogOut size={18} className="shrink-0" />
              <span className="ml-4 truncate">
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
            <img 
              src={settings?.logo_base64 || LogoNebula} 
              alt="Logo" 
              className="w-6 h-6 object-contain drop-shadow-md" 
            />
          </div>
          <div className="flex-1 flex items-center justify-center w-full relative">
            <h1
              className="text-white font-bold text-xs tracking-wider uppercase whitespace-nowrap absolute origin-center rotate-90"
            >
              Nebula Envelope
            </h1>
          </div>
        </div>
      )}
    </aside>
  );
}
