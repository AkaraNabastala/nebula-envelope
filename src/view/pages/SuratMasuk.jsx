import React, { useState, useEffect } from 'react';

export default function SuratMasuk() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State Penyimpanan Data dari SQLite
  const [suratList, setSuratList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [entitasList, setEntitasList] = useState([]);

  // State Form Input Surat Baru
  const [formData, setFormData] = useState({
    nomorSurat: '',
    judulSurat: '',
    tanggal: '',
    entitasId: '',
    kategoriId: '',
    filePath: ''
  });

  const [notif, setNotif] = useState('');
  const [namaFileTampil, setNamaFileTampil] = useState('');

  // Fungsi sinkronisasi memuat data dari database lokal
  const muatDataHalaman = async () => {
    try {
      if (window.api) {
        const surat = await window.api.getSuratMasuk();
        const kategori = await window.api.getKategoriSurat();
        const entitas = await window.api.getEntitas(''); // Ambil semua kontak pengirim
        
        setSuratList(surat);
        setKategoriList(kategori);
        setEntitasList(entitas);
      }
    } catch (error) {
      console.error("Gagal sinkronisasi database:", error);
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

  // Fungsi untuk memilih dan menyalin file dari komputer (PDF/JPG/PNG)
  const handlePilihBerkas = async () => {
    if (window.api && window.api.pilihFileArsip) {
      const fileInfo = await window.api.pilihFileArsip();
      if (fileInfo) {
        // Simpan path-nya ke formData untuk di-insert ke SQLite
        setFormData(prev => ({ ...prev, filePath: fileInfo.path_simpan }));
        // Tampilkan nama aslinya di layar agar pengguna tahu file sudah masuk
        setNamaFileTampil(fileInfo.nama_file);
      }
    }
  };

  // Fungsi untuk menyimpan seluruh data form ke SQLite
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nomorSurat || !formData.judulSurat || !formData.entitasId || !formData.kategoriId) {
      alert("Mohon lengkapi seluruh kolom wajib.");
      return;
    }

    try {
      if (window.api && window.api.tambahSuratMasuk) {
        // Kirim data objek ke SQLite
        await window.api.tambahSuratMasuk(formData);
        
        // Reset state dan tutup modal
        setIsModalOpen(false);
        setFormData({ nomorSurat: '', judulSurat: '', tanggal: '', entitasId: '', kategoriId: '', filePath: '' });
        setNamaFileTampil(''); // Reset juga nama file
        
        // Munculkan notifikasi & muat ulang tabel
        setNotif('Surat masuk dan berkas fisiknya berhasil diarsipkan.');
        muatDataHalaman();
        
        setTimeout(() => setNotif(''), 3500);
      }
    } catch (error) {
      console.error("Gagal menyimpan surat:", error);
      alert("Terjadi kesalahan komputasi lokal saat menyimpan surat.");
    }
  };

  // Fungsi untuk membuka file fisik yang sudah tersimpan
  const handleBukaDokumen = async (pathFile) => {
    if (window.api && window.api.bukaFileArsip) {
      await window.api.bukaFileArsip(pathFile);
    } else {
      alert("Fungsi buka dokumen belum terhubung ke sistem OS.");
    }
  };

  // Fungsi Hapus Surat
  const handleHapusSurat = async (id, nomorSurat) => {
    const konfirmasi = window.confirm(`PERINGATAN!\n\nApakah Anda yakin ingin menghapus surat ${nomorSurat} secara permanen?\nFile fisik (jika ada) juga akan dihapus dari sistem komputer.`);
    
    if (konfirmasi) {
      try {
        if (window.api && window.api.hapusSurat) {
          await window.api.hapusSurat(id);
          setNotif(`Surat ${nomorSurat} berhasil dihapus permanen.`);
          muatDataHalaman(); // Segarkan tabel
          setTimeout(() => setNotif(''), 3000);
        }
      } catch (error) {
        console.error("Gagal menghapus surat:", error);
        alert("Terjadi kesalahan saat menghapus data.");
      }
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
        `}
      </style>

      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header Halaman */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 slide-reveal delay-100 ${isLoaded ? 'active' : ''}`}>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Arsip Surat Masuk</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Kelola dokumen eksternal yang masuk ke dalam sistem luring.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Rekam Surat Baru</span>
          </button>
        </div>

        {/* Toast Notifikasi Sukses */}
        {notif && (
          <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl shadow-xl text-sm font-bold flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{notif}</span>
          </div>
        )}

        {/* Tabel Arsip Surat Masuk */}
        <div className={`bg-white rounded-[1.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden slide-reveal delay-200 ${isLoaded ? 'active' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-widest font-extrabold border-b border-slate-100">
                <tr>
                  <th className="p-5 w-16 text-center">No</th>
                  <th className="p-5">Informasi Surat</th>
                  <th className="p-5">Instansi Pengirim</th>
                  <th className="p-5">Kategori</th>
                  <th className="p-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                
                {suratList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="p-5">
                      <p className="font-bold text-slate-800 text-base mb-0.5">{item.nomor_surat}</p>
                      <p className="text-slate-600 font-medium text-sm">{item.judul_surat}</p>
                      <p className="text-slate-400 text-[10px] mt-1 font-semibold">Tgl Rekam: {item.tanggal}</p>
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-slate-700">{item.nama_pengirim || 'Entitas Terhapus'}</p>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold">
                        {item.nama_kategori || 'Umum'}
                      </span>
                    </td>
                    <td className="p-5 text-right flex items-center justify-end space-x-2">
                      {/* Tombol Lihat Berkas */}
                      {item.file_path ? (
                        <button 
                          onClick={() => handleBukaDokumen(item.file_path)}
                          title="Buka Dokumen"
                          className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 italic mr-2">Tanpa Lampiran</span>
                      )}

                      {/* Tombol Hapus */}
                      <button 
                        onClick={() => handleHapusSurat(item.id, item.nomor_surat)}
                        title="Hapus Permanen"
                        className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}

                {suratList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-20 text-center">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100 text-slate-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2-2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      </div>
                      <p className="text-slate-600 font-bold">Belum ada arsip surat masuk</p>
                      <p className="text-slate-400 text-xs mt-1">Silakan rekam surat baru melalui tombol di atas.</p>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================== */}
        {/* MODAL JENDELA INPUT SURAT BARU             */}
        {/* ========================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

            <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]" style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              
              {/* Header Modal */}
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">Rekam Surat Masuk</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Penyimpanan Luring</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body Form Modal */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                <form id="formSuratMasuk" onSubmit={handleSubmit} className="space-y-5">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Nomor Surat */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Nomor Surat Fisik</label>
                      <input 
                        type="text" 
                        name="nomorSurat"
                        value={formData.nomorSurat}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Contoh: 045/SPK/VII/2026"
                      />
                    </div>
                    
                    {/* Tanggal */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Tanggal Diterima</label>
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
                    {/* DROPDOWN PENGIRIM */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Instansi / Individu Pengirim</label>
                      <select
                        name="entitasId"
                        value={formData.entitasId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Pilih Kontak Pengirim --</option>
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

                  {/* Perihal / Judul */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Perihal / Deskripsi Ringkas</label>
                    <textarea 
                      name="judulSurat"
                      value={formData.judulSurat}
                      onChange={handleInputChange}
                      required
                      rows="2"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                      placeholder="Contoh: Pengadaan prasarana komputasi..."
                    ></textarea>
                  </div>

                  {/* Upload Berkas (Area Pemilihan File Dokumen/Gambar) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Pindai / Unggah Berkas (PDF/JPG/PNG)</label>
                    <div 
                      onClick={handlePilihBerkas}
                      className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer group ${
                        namaFileTampil ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50'
                      }`}
                    >
                      {namaFileTampil ? (
                        <>
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <p className="text-sm font-bold text-emerald-700 truncate px-4">{namaFileTampil}</p>
                          <p className="text-[11px] font-semibold text-emerald-600/80 mt-0.5">Tersalin ke brankas sistem</p>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          </div>
                          <p className="text-sm font-bold text-slate-700">Klik untuk memilih file Dokumen / Gambar</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Opsional (Format: PDF, JPG, PNG)</p>
                        </>
                      )}
                    </div>
                  </div>

                </form>
              </div>

              {/* Tombol Aksi */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  form="formSuratMasuk"
                  className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Simpan & Arsipkan
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}