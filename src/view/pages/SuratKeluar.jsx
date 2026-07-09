import React, { useState, useEffect } from 'react';

export default function SuratKeluar() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State Penyimpanan Data dari SQLite
  const [suratList, setSuratList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [entitasList, setEntitasList] = useState([]);

  // State Form Input Surat Keluar Baru
  const [formData, setFormData] = useState({
    nomorSurat: '',
    judulSurat: '',
    tanggal: '',
    entitasId: '',
    kategoriId: '',
    filePath: ''
  });

  const [notif, setNotif] = useState('');

  // Fungsi sinkronisasi memuat data dari database lokal
  const muatDataHalaman = async () => {
    try {
      if (window.api) {
        const surat = await window.api.getSuratKeluar();
        const kategori = await window.api.getKategoriSurat();
        const entitas = await window.api.getEntitas(''); // Ambil semua kontak penerima
        
        setSuratList(surat);
        setKategoriList(kategori);
        setEntitasList(entitas);
      }
    } catch (error) {
      console.error("Gagal sinkronisasi database surat keluar:", error);
    }
  };

  useEffect(() => {
    setIsLoaded(true);
    muatDataHalaman();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nomorSurat || !formData.judulSurat || !formData.entitasId || !formData.kategoriId) {
      alert("Mohon lengkapi seluruh kolom wajib.");
      return;
    }

    try {
      if (window.api && window.api.tambahSuratKeluar) {
        // Kirim data objek ke SQLite
        await window.api.tambahSuratKeluar(formData);
        
        // Reset state dan tutup modal
        setIsModalOpen(false);
        setFormData({ nomorSurat: '', judulSurat: '', tanggal: '', entitasId: '', kategoriId: '', filePath: '' });
        
        // Munculkan notifikasi & muat ulang tabel
        setNotif('Dokumen surat keluar berhasil diterbitkan dan diarsipkan.');
        muatDataHalaman();
        
        setTimeout(() => setNotif(''), 3000);
      }
    } catch (error) {
      console.error("Gagal menyimpan surat keluar:", error);
      alert("Terjadi kesalahan komputasi lokal saat mengarsipkan surat.");
    }
  };

  return (
    <>
      <style>
        {`
          .slide-reveal {
            opacity: 0;
            transform: translateY(24px);
            transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .slide-reveal.active { opacity: 1; transform: translateY(0); }
          .delay-100 { transition-delay: 100ms; }
          .delay-200 { transition-delay: 200ms; }
          
          @keyframes modalSlideUp {
            from { opacity: 0; transform: scale(0.96) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}
      </style>

      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header Halaman */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 slide-reveal delay-100 ${isLoaded ? 'active' : ''}`}>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Arsip Surat Keluar</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Pantau dan kelola seluruh dokumen resmi yang diterbitkan oleh institusi.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Penerbitan Surat</span>
          </button>
        </div>

        {/* Toast Notifikasi Sukses */}
        {notif && (
          <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl shadow-xl text-sm font-bold flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{notif}</span>
          </div>
        )}

        {/* Tabel Arsip Surat Keluar */}
        <div className={`bg-white rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden slide-reveal delay-200 ${isLoaded ? 'active' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-widest font-extrabold border-b border-slate-100">
                <tr>
                  <th className="p-5 w-16 text-center">No</th>
                  <th className="p-5">Informasi Surat</th>
                  <th className="p-5">Tujuan Penerima</th>
                  <th className="p-5">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                
                {suratList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="p-5">
                      <p className="font-bold text-slate-800 text-base mb-0.5">{item.nomor_surat}</p>
                      <p className="text-slate-600 font-medium text-sm">{item.judul_surat}</p>
                      <p className="text-slate-400 text-[10px] mt-1 font-semibold">Tgl Terbit: {item.tanggal}</p>
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-slate-700">{item.nama_penerima || 'Entitas Terhapus'}</p>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 rounded-full text-xs font-bold">
                        {item.nama_kategori || 'Umum'}
                      </span>
                    </td>
                  </tr>
                ))}

                {suratList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-20 text-center">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100 text-slate-300">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </div>
                      <p className="text-slate-600 font-bold">Belum ada arsip surat keluar</p>
                      <p className="text-slate-400 text-xs mt-1">Silakan terbitkan surat baru melalui tombol di atas.</p>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================== */}
        {/* MODAL JENDELA INPUT SURAT KELUAR BARU      */}
        {/* ========================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

            <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]" style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              
              {/* Header Modal */}
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">Registrasi Surat Keluar</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Arsip Institusi Luring</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body Form Modal */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                <form id="formSuratKeluar" onSubmit={handleSubmit} className="space-y-5">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Nomor Surat */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Nomor Surat Resmi</label>
                      <input 
                        type="text" 
                        name="nomorSurat"
                        value={formData.nomorSurat}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Contoh: 088/NABASTALA/VII/2026"
                      />
                    </div>
                    
                    {/* Tanggal Terbit */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Tanggal Keluar / Terbit</label>
                      <input 
                        type="date" 
                        name="tanggal"
                        value={formData.tanggal}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* DROPDOWN PENERIMA (Membaca Master Data Entitas) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Ditujukan Kepada (Penerima)</label>
                      <select
                        name="entitasId"
                        value={formData.entitasId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Pilih Kontak Penerima --</option>
                        {entitasList.map(ent => (
                          <option key={ent.id} value={ent.id}>{ent.nama} ({ent.kategori})</option>
                        ))}
                      </select>
                    </div>

                    {/* DROPDOWN KATEGORI */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Klasifikasi Dokumen</label>
                      <select
                        name="kategoriId"
                        value={formData.kategoriId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {kategoriList.map(kat => (
                          <option key={kat.id} value={kat.id}>{kat.nama_kategori}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Perihal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Perihal / Deskripsi Ringkas</label>
                    <textarea 
                      name="judulSurat"
                      value={formData.judulSurat}
                      onChange={handleInputChange}
                      required
                      rows="2"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                      placeholder="Contoh: Pemanggilan verifikasi berkas mutasi karyawan..."
                    ></textarea>
                  </div>

                </form>
              </div>

              {/* Tombol Aksi */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  form="formSuratKeluar"
                  className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Terbitkan & Arsipkan
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}