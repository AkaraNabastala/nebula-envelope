import React, { useState, useEffect } from 'react';

export default function DataEntitas() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entitasList, setEntitasList] = useState([]);
  const [filterKategori, setFilterKategori] = useState('');

  // State untuk form input entitas baru
  const [formData, setFormData] = useState({
    kategori: 'Karyawan',
    nama: '',
    nomor_induk: '',
    kontak: '',
    detail_tambahan: ''
  });

  const [notif, setNotif] = useState({ msg: '', type: '' });

  // Fungsi untuk menarik data dari SQLite luring
  const muatDataEntitas = async () => {
    try {
      if (window.api && window.api.getEntitas) {
        const data = await window.api.getEntitas(filterKategori);
        setEntitasList(data);
      }
    } catch (error) {
      console.error("Gagal memuat data entitas:", error);
    }
  };

  useEffect(() => {
    setIsLoaded(true);
    muatDataEntitas();
  }, [filterKategori]); // Otomatis memuat ulang jika filter kategori diubah

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama) {
      setNotif({ msg: 'Nama Entitas wajib diisi.', type: 'error' });
      return;
    }

    try {
      if (window.api && window.api.tambahEntitas) {
        await window.api.tambahEntitas(formData);
        
        // Reset Form & Tutup Modal
        setIsModalOpen(false);
        setFormData({ kategori: 'Karyawan', nama: '', nomor_induk: '', kontak: '', detail_tambahan: '' });
        
        // Tampilkan Notifikasi Sukses
        setNotif({ msg: 'Entitas baru berhasil didaftarkan secara luring.', type: 'success' });
        muatDataEntitas(); // Refresh tabel

        setTimeout(() => setNotif({ msg: '', type: '' }), 3500);
      }
    } catch (error) {
      setNotif({ msg: 'Terjadi kesalahan sistem saat menyimpan data.', type: 'error' });
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
          .slide-reveal.active {
            opacity: 1;
            transform: translateY(0);
          }
          .delay-100 { transition-delay: 100ms; }
          .delay-200 { transition-delay: 200ms; }
        `}
      </style>

      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header Halaman */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 slide-reveal delay-100 ${isLoaded ? 'active' : ''}`}>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Database Entitas</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Kelola data master personel, mitra korporat, atau instansi relasi.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_25px_-8px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 flex items-center justify-center space-x-2 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Registrasi Entitas</span>
          </button>
        </div>

        {/* Notifikasi Sistem Toast Melayang */}
        {notif.msg && (
          <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-sm font-bold backdrop-blur-md animate-bounce ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <span className={`w-2 h-2 rounded-full ${notif.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span>{notif.msg}</span>
          </div>
        )}

        {/* Kontrol Saring Kategori (Tabs Gaya Minimalis) */}
        <div className={`flex items-center space-x-2 border-b border-slate-200 pb-px mb-8 slide-reveal delay-200 ${isLoaded ? 'active' : ''}`}>
          {['', 'Karyawan', 'Guru', 'Siswa', 'Mitra'].map((kat) => (
            <button
              key={kat}
              onClick={() => setFilterKategori(kat)}
              className={`px-4 py-3 text-sm font-bold transition-all relative ${filterKategori === kat ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {kat === '' ? 'Semua Entitas' : kat}
              {filterKategori === kat && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tabel Data Tanpa Bungkus Card luar */}
        <div className={`bg-white rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden slide-reveal delay-200 ${isLoaded ? 'active' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-widest font-extrabold border-b border-slate-100">
                <tr>
                  <th className="p-5 w-16 text-center">No</th>
                  <th className="p-5">Nama Lengkap / Instansi</th>
                  <th className="p-5">Nomor Induk (ID)</th>
                  <th className="p-5">Kontak / Saluran</th>
                  <th className="p-5">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                
                {entitasList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="p-5">
                      <p className="font-bold text-slate-800 text-base">{item.nama}</p>
                      <p className="text-slate-400 text-xs mt-0.5 font-medium">{item.detail_tambahan || 'Tidak ada catatan tambahan'}</p>
                    </td>
                    <td className="p-5 font-mono text-xs text-slate-600 bg-slate-50/30 group-hover:bg-transparent transition-colors">
                      {item.nomor_induk || '—'}
                    </td>
                    <td className="p-5 text-slate-600 font-medium">
                      {item.kontak || '—'}
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                        item.kategori === 'Karyawan' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        item.kategori === 'Guru' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        item.kategori === 'Siswa' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.kategori}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* State Jika Database SQLite Kosong */}
                {entitasList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <p className="text-slate-600 font-bold text-base">Database Lokal Masih Kosong</p>
                      <p className="text-slate-400 text-sm mt-1">Klik tombol 'Registrasi Entitas' di atas untuk memasukkan data luring pertama Anda.</p>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================== */}
        {/* MODAL REGISTRASI ENTITAS                   */}
        {/* ========================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

            <div className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]" style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Registrasi Entitas</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Penyimpanan Luring</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="formEntitas" onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Pilihan Kategori */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">Klasifikasi Kategori</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Karyawan', 'Guru', 'Siswa', 'Mitra'].map((kat) => (
                        <button
                          key={kat}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, kategori: kat }))}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${formData.kategori === kat ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                        >
                          {kat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Nama Lengkap / Instansi</label>
                    <input 
                      type="text" 
                      name="nama"
                      value={formData.nama}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Masukkan nama resmi..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* ID / Nomor Induk */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Nomor Induk (NIK/NIP/NIS)</label>
                      <input 
                        type="text" 
                        name="nomor_induk"
                        value={formData.nomor_induk}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Contoh: 19940211..."
                      />
                    </div>
                    
                    {/* Kontak */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Nomor Kontak / Telepon</label>
                      <input 
                        type="text" 
                        name="kontak"
                        value={formData.kontak}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Contoh: 0812..."
                      />
                    </div>
                  </div>

                  {/* Detail Tambahan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Catatan Internal / Detail Tambahan</label>
                    <textarea 
                      name="detail_tambahan"
                      value={formData.detail_tambahan}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                      placeholder="Contoh: Divisi IT / Asal Instansi Cabang Barat..."
                    ></textarea>
                  </div>

                </form>
              </div>

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
                  form="formEntitas"
                  className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Simpan ke SQLite
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}