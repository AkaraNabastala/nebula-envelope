import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Sesuaikan path jika berbeda
import Header from './Header';   // Sesuaikan path jika berbeda

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans">
      
      {/* Sidebar selalu berada di sisi kiri */}
      <Sidebar />

      {/* Area Kanan */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Latar belakang dinamis halus (Opsional, agar tidak terlalu polos) */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        
        {/* Header selalu berada di sisi atas konten */}
        <Header />
        
        {/* Area Konten Utama tempat halaman dirender secara dinamis */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}