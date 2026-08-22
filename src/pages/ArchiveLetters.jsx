import React, { useState, useRef } from 'react';
import { saveIncomingArchive, deleteIncomingArchive, deleteOutgoingLetter, updateOutgoingStatus } from '../services/db';
import { Archive, Plus, Upload, FileText, Folder, Eye, Search, Filter, Trash2, Edit2, Download, Send } from 'lucide-react';

export default function ArchiveLetters({ incomingArchives, outgoingLetters, settings, onArchiveAdded, onViewDocument, onOpenFolderPicker }) {
  const [activeSubTab, setActiveSubTab] = useState('masuk'); // 'masuk' atau 'keluar'
  
  // State Form Modal Tambah Arsip Masuk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nomorSurat, setNomorSurat] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [perihal, setPerihal] = useState('');
  const [tanggalDiterima, setTanggalDiterima] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setNomorSurat('');
    setPengirim('');
    setPerihal('');
    setFileName('');
    setFileBase64('');
    setEditingId(null);
    setIsEditMode(false);
  };

  const handleOpenModalBaru = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditMasuk = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setNomorSurat(item.nomor_surat);
    setPengirim(item.pengirim);
    setPerihal(item.perihal);
    setTanggalDiterima(item.tanggal_diterima || new Date().toISOString().split('T')[0]);
    setFileName(item.file_name === 'Tidak ada lampiran fisik' ? '' : item.file_name);
    setFileBase64(''); // Reset base64 unless re-uploaded
    setIsModalOpen(true);
  };

  const handleDelete = async (item, tipe) => {
    if (window.confirm(`PERINGATAN!\n\nApakah Anda yakin ingin menghapus surat nomor: ${item.nomor_surat}?\nJika Anda menjalankan aplikasi via Launcher (Desktop), file fisiknya di hardisk juga dapat ikut terhapus.`)) {
      if (tipe === 'masuk') {
        await deleteIncomingArchive(item.id);
      } else {
        await deleteOutgoingLetter(item.id);
      }
      
      // Attempt to physically delete if in Electron
      if (window.electronAPI && window.electronAPI.hapusSuratFisik) {
        // Assuming we could pass path to backend to delete. 
        // For now, the DB deletion is enough for the prototype.
      }
      
      if (onArchiveAdded) onArchiveAdded();
    }
  };

  const handleEditKeluar = (item) => {
    alert("Surat Keluar ini sudah diregistrasi & dicetak.\n\nUntuk mengubah isinya, Anda disarankan untuk membuat surat baru di menu 'Buat Surat Baru' menggunakan nomor revisi.");
  };

  const handleFileChange = (file) => {
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      setFileBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleSimpanArsip = async (e) => {
    e.preventDefault();

    const folderTarget = settings?.folder_surat_masuk || 'D:/data/surat/masuk';

    if (fileBase64 && window.electronAPI && window.electronAPI.saveFile) {
      const saveRes = await window.electronAPI.saveFile({
        folderPath: folderTarget,
        fileName: fileName,
        fileData: fileBase64,
        isBase64: true
      });
      if (!saveRes.success) {
        alert("Gagal menyimpan file fisik: " + saveRes.error);
        return;
      }
    }

    const archiveData = {
      ...(isEditMode && { id: editingId }), // Inject ID if editing
      nomor_surat: nomorSurat,
      pengirim: pengirim,
      perihal: perihal,
      tanggal_diterima: tanggalDiterima,
      file_name: fileName || 'Tidak ada lampiran fisik',
      folder_tersimpan: folderTarget
    };

    await saveIncomingArchive(archiveData);
    if (onArchiveAdded) onArchiveAdded();
    setIsModalOpen(false);
    resetForm();
  };

  const handleExportCSV = () => {
    let data = [];
    let headers = [];
    let filename = '';

    if (activeSubTab === 'masuk') {
      headers = ['Nomor Surat', 'Pengirim', 'Perihal', 'Tanggal Diterima', 'File Lampiran', 'Lokasi Folder'];
      data = (incomingArchives||[]).map(item => [
        item.nomor_surat, item.pengirim, item.perihal, item.tanggal_diterima, item.file_name, item.folder_tersimpan
      ]);
      filename = 'Rekap_Surat_Masuk.csv';
    } else {
      headers = ['Nomor Surat', 'Template', 'Perihal', 'Tanggal Dibuat', 'Status', 'File Lampiran', 'Lokasi Folder'];
      data = (outgoingLetters||[]).map(item => [
        item.nomor_surat, item.nama_template, item.perihal || item.formData?.perihal || '-', item.created_at, item.status, item.nama_file, item.folder_tersimpan
      ]);
      filename = 'Rekap_Surat_Keluar.csv';
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'Terkirim' ? 'Draf' : 'Terkirim';
    await updateOutgoingStatus(item.id, newStatus);
    if (onArchiveAdded) onArchiveAdded();
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex flex-col font-sans relative">
      
      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-400/20 rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-[120px] translate-y-1/4 -translate-x-1/4 pointer-events-none"></div>

      {/* Main Glass Container */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden relative z-10 p-5 lg:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Archive size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pusat Arsip</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Manajemen rekam jejak dokumen digital Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Download size={16} />
              Export
            </button>
            {activeSubTab === 'masuk' && (
              <button
                onClick={handleOpenModalBaru}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all hover:-translate-y-1 active:scale-[0.98]"
              >
                <Plus size={18} />
                Arsip Masuk Baru
              </button>
            )}
          </div>
        </div>

        {/* Ultra-Premium Tab Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 shrink-0">
          
          {/* Tab Arsip Masuk */}
          <div 
            onClick={() => setActiveSubTab('masuk')}
            className={`cursor-pointer rounded-2xl p-5 transition-all duration-500 relative overflow-hidden group ${
              activeSubTab === 'masuk'
                ? 'bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl shadow-slate-900/30 scale-[1.02] border border-slate-700'
                : 'bg-white/60 hover:bg-white border border-slate-200/50 hover:shadow-lg hover:shadow-slate-200/50'
            }`}
          >
            <div className={`absolute -right-6 -top-6 transition-transform duration-700 ${activeSubTab === 'masuk' ? 'rotate-12 scale-110 opacity-10' : 'opacity-5 group-hover:rotate-12 group-hover:scale-110'}`}>
              <Archive size={100} className={activeSubTab === 'masuk' ? 'text-emerald-400' : 'text-slate-900'} />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${
                  activeSubTab === 'masuk' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Archive size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  activeSubTab === 'masuk' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 text-slate-500'
                }`}>Surat Masuk</span>
              </div>
              <h3 className={`text-3xl font-black mb-1 tabular-nums tracking-tighter ${activeSubTab === 'masuk' ? 'text-white' : 'text-slate-800'}`}>
                {incomingArchives?.length || 0}
              </h3>
              <p className={`text-xs font-bold ${activeSubTab === 'masuk' ? 'text-slate-400' : 'text-slate-500'}`}>
                Dokumen Tersimpan
              </p>
            </div>
          </div>

          {/* Tab Surat Keluar */}
          <div 
            onClick={() => setActiveSubTab('keluar')}
            className={`cursor-pointer rounded-2xl p-5 transition-all duration-500 relative overflow-hidden group ${
              activeSubTab === 'keluar'
                ? 'bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl shadow-slate-900/30 scale-[1.02] border border-slate-700'
                : 'bg-white/60 hover:bg-white border border-slate-200/50 hover:shadow-lg hover:shadow-slate-200/50'
            }`}
          >
            <div className={`absolute -right-6 -top-6 transition-transform duration-700 ${activeSubTab === 'keluar' ? 'rotate-12 scale-110 opacity-10' : 'opacity-5 group-hover:rotate-12 group-hover:scale-110'}`}>
              <FileText size={100} className={activeSubTab === 'keluar' ? 'text-indigo-400' : 'text-slate-900'} />
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${
                  activeSubTab === 'keluar' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-100 text-slate-500'
                }`}>
                  <FileText size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  activeSubTab === 'keluar' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-100 text-slate-500'
                }`}>Surat Keluar</span>
              </div>
              <h3 className={`text-3xl font-black mb-1 tabular-nums tracking-tighter ${activeSubTab === 'keluar' ? 'text-white' : 'text-slate-800'}`}>
                {outgoingLetters?.length || 0}
              </h3>
              <p className={`text-xs font-bold ${activeSubTab === 'keluar' ? 'text-slate-400' : 'text-slate-500'}`}>
                Dokumen Teregistrasi
              </p>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 bg-white/60 rounded-3xl border border-slate-200/50 flex flex-col overflow-hidden shadow-inner">
          <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-white/40">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari arsip..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" />
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors">
              <Filter size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm rounded-xl">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 rounded-l-xl">Nomor Surat</th>
                  <th className="px-6 py-4">{activeSubTab === 'masuk' ? 'Pengirim' : 'Template & Status'}</th>
                  <th className="px-6 py-4">Perihal</th>
                  <th className="px-6 py-4">Lokasi Arsip</th>
                  <th className="px-6 py-4 text-right rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {activeSubTab === 'masuk' ? (
                  incomingArchives && incomingArchives.length > 0 ? (
                    incomingArchives.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-800">{item.nomor_surat}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-100 rounded-lg">{item.pengirim}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700 max-w-[200px] truncate">{item.perihal}</p>
                          {item.file_name && item.file_name !== 'Tidak ada lampiran fisik' && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1.5 w-max font-bold border border-emerald-100">
                              <FileText size={10} /> {item.file_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <code className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-200 text-[10px] font-mono font-bold truncate max-w-[150px] inline-block">
                            {item.folder_tersimpan || settings?.folder_surat_masuk}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onViewDocument(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 hover:shadow-md transition-all"
                              title="Buka Detail"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEditMasuk(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 hover:shadow-md transition-all"
                              title="Edit Arsip"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(item, 'masuk')}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-100 hover:shadow-md transition-all"
                              title="Hapus Permanen"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 text-slate-300 mb-4 shadow-inner border border-slate-100">
                          <Archive size={32} />
                        </div>
                        <p className="text-slate-500 font-bold">Belum ada arsip surat masuk.</p>
                      </td>
                    </tr>
                  )
                ) : (
                  outgoingLetters && outgoingLetters.length > 0 ? (
                    outgoingLetters.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-800">{item.nomor_surat}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider w-max">
                              {item.nama_template || 'Surat Kustom'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest w-max border ${item.status === 'Terkirim' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {item.status || 'Draf'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700 max-w-[200px] truncate">{item.perihal || item.formData?.perihal || '-'}</p>
                          {item.nama_file && (
                            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1.5 w-max font-bold border border-indigo-100">
                              <FileText size={10} /> {item.nama_file}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <code className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-200 text-[10px] font-mono font-bold truncate max-w-[150px] inline-block">
                            {item.folder_tersimpan || settings?.folder_surat_keluar}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${item.status === 'Terkirim' ? 'bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600'} hover:shadow-md transition-all`}
                              title={item.status === 'Terkirim' ? 'Tandai sebagai Draf' : 'Tandai sebagai Terkirim'}
                            >
                              {item.status === 'Terkirim' ? <Archive size={16} /> : <Send size={16} />}
                            </button>
                            <button
                              onClick={() => onViewDocument(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 hover:shadow-md transition-all"
                              title="Buka Surat"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEditKeluar(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-orange-100 hover:shadow-md transition-all"
                              title="Edit Arsip"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(item, 'keluar')}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-100 hover:shadow-md transition-all"
                              title="Hapus Permanen"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 text-slate-300 mb-4 shadow-inner border border-slate-100">
                          <FileText size={32} />
                        </div>
                        <p className="text-slate-500 font-bold">Belum ada riwayat surat keluar.</p>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Input Surat Masuk - Ultra Premium */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white/90 backdrop-blur-2xl w-full max-w-lg rounded-[2rem] p-6 shadow-2xl relative z-10 border border-white flex flex-col animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg ${isEditMode ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30' : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30'}`}>
                  {isEditMode ? <Edit2 size={20} /> : <Archive size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{isEditMode ? 'Edit Surat Masuk' : 'Rekam Surat Masuk'}</h3>
                  <p className="text-[11px] font-bold text-slate-500">{isEditMode ? 'Ubah informasi arsip dokumen luar.' : 'Arsipkan dokumen dari pihak luar.'}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSimpanArsip} className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-5">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 px-1 ${isEditMode ? 'text-indigo-600' : 'text-emerald-600'}`}>Nomor Surat Masuk</label>
                  <input 
                    type="text" 
                    value={nomorSurat} 
                    onChange={(e) => setNomorSurat(e.target.value)} 
                    required 
                    className={`w-full px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white transition-all font-bold text-slate-800 text-sm outline-none shadow-inner ${isEditMode ? 'focus:border-indigo-500' : 'focus:border-emerald-500'}`}
                    placeholder="Ketik nomor surat resmi..." 
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 px-1 ${isEditMode ? 'text-indigo-600' : 'text-emerald-600'}`}>Instansi Pengirim</label>
                  <input 
                    type="text" 
                    value={pengirim} 
                    onChange={(e) => setPengirim(e.target.value)} 
                    required 
                    className={`w-full px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white transition-all font-bold text-slate-800 text-sm outline-none shadow-inner ${isEditMode ? 'focus:border-indigo-500' : 'focus:border-emerald-500'}`}
                    placeholder="Contoh: Dinas Pendidikan Provinsi..." 
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 px-1 ${isEditMode ? 'text-indigo-600' : 'text-emerald-600'}`}>Perihal Dokumen</label>
                  <textarea 
                    value={perihal} 
                    onChange={(e) => setPerihal(e.target.value)} 
                    required 
                    rows="2" 
                    className={`w-full px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white transition-all font-bold text-slate-800 text-sm resize-none outline-none shadow-inner ${isEditMode ? 'focus:border-indigo-500' : 'focus:border-emerald-500'}`}
                    placeholder="Ringkasan atau tujuan surat..." 
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                  <Folder size={12}/> Lampiran File Fisik (Opsional)
                </label>
                
                <div 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                    ${isDragging ? (isEditMode ? 'border-indigo-500 bg-indigo-50 scale-[0.98]' : 'border-emerald-500 bg-emerald-50 scale-[0.98]') : (isEditMode ? 'border-slate-300 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-300' : 'border-slate-300 bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-300')}`}
                >
                  <input 
                    type="file" 
                    onChange={(e) => handleFileChange(e.target.files[0])} 
                    ref={fileInputRef} 
                    className="hidden" 
                  />
                  {fileName ? (
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 text-white rounded-xl flex items-center justify-center mb-3 shadow-md ${isEditMode ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-500/30' : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30'}`}>
                        <FileText size={24} />
                      </div>
                      <p className="font-black text-slate-800 truncate max-w-full px-4 text-xs">{fileName}</p>
                      <p className={`text-[9px] font-bold mt-1.5 px-3 py-1 rounded-full ${isEditMode ? 'text-indigo-600 bg-indigo-50' : 'text-emerald-600 bg-emerald-50'}`}>{isEditMode && !fileBase64 ? 'File Lama (Tidak Diubah)' : 'Lampiran Siap Disimpan'}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white text-slate-400 rounded-xl flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                        <Upload size={24} />
                      </div>
                      <p className="font-black text-slate-700 text-xs">Klik atau Seret File Kesini</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">PDF • DOCX • JPG • PNG</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-colors text-xs"
                >
                  Batalkan
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 py-3 rounded-xl text-white font-black text-xs shadow-lg transition-all hover:-translate-y-0.5 ${isEditMode ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-indigo-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/25'}`}
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan & Arsipkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
