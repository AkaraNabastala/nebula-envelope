import React, { useState, useRef } from 'react';
import { addMasterItem, deleteMasterItem, bulkDeleteMasterItems, deleteAllMasterItems, triggerReload, triggerToast } from '../services/db';
import { Plus, Trash, Database, Save, Upload, FileSpreadsheet, Download, Info, X, AlertTriangle, Eye, ChevronDown, Keyboard, Check } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function MasterData({ masterData, onMasterUpdated }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [importProgress, setImportProgress] = useState({ isImporting: false, current: 0, total: 0 });
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', desc: '', actionLabel: '', onConfirm: null, type: 'danger' });
  
  const [nama, setNama] = useState('');
  const [attributes, setAttributes] = useState([]);
  
  // Selection States
  const [selectedIds, setSelectedIds] = useState([]);

  const handleAddAttributeRow = () => {
    setAttributes(prev => [...prev, { key: '', value: '' }]);
  };

  const handleAttributeChange = (index, field, value) => {
    setAttributes(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleRemoveAttributeRow = (index) => {
    setAttributes(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveMaster = async (e) => {
    e.preventDefault();

    const attrObj = {};
    attributes.forEach(attr => {
      if (attr.key.trim()) {
        attrObj[attr.key.trim().toLowerCase().replace(/\s+/g, '_')] = attr.value;
      }
    });

    await addMasterItem({
      nama,
      attributes: attrObj
    });

    triggerToast('Berhasil!', 'Data pengguna berhasil ditambahkan!');
    if (onMasterUpdated) onMasterUpdated();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: 'Hapus data user ini?',
      desc: 'Data pengguna ini akan dihapus secara permanen.',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Data', subtitle: 'Membuang dari database...' } }));
        try {
          await new Promise(r => setTimeout(r, 1000));
          await deleteMasterItem(id);
          setSelectedIds(prev => prev.filter(i => i !== id));
          if (onMasterUpdated) onMasterUpdated();
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => triggerToast('Berhasil!', 'Data pengguna berhasil dihapus!'), 300);
        } catch (e) {
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => toast.error('Gagal menghapus data'), 300);
        }
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked && masterData) {
      setSelectedIds(masterData.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation(); // prevent modal opening
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: `Hapus ${selectedIds.length} data terpilih?`,
      desc: 'Data pengguna yang dipilih akan dihapus secara permanen.',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Data', subtitle: 'Membuang dari database...' } }));
        try {
          await new Promise(r => setTimeout(r, 1200));
          await bulkDeleteMasterItems(selectedIds);
          setSelectedIds([]);
          if (onMasterUpdated) onMasterUpdated();
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => triggerToast('Berhasil!', `${selectedIds.length} data pengguna berhasil dihapus!`), 300);
        } catch (e) {
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => toast.error('Gagal menghapus data'), 300);
        }
      }
    });
  };

  const handleDeleteAll = async () => {
    if (!masterData || masterData.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: 'Hapus SELURUH data user?',
      desc: 'PERINGATAN: Tindakan ini akan menghapus semua data user secara permanen dan tidak dapat dibatalkan!',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Mengosongkan Data', subtitle: 'Membuang seluruh data dari database...' } }));
        try {
          await new Promise(r => setTimeout(r, 1500));
          await deleteAllMasterItems();
          setSelectedIds([]);
          if (onMasterUpdated) onMasterUpdated();
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => triggerToast('Berhasil!', 'Seluruh data pengguna berhasil dikosongkan!'), 300);
        } catch (e) {
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => toast.error('Gagal mengosongkan data'), 300);
        }
      }
    });
  };

  const fileInputRef = useRef(null);

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (jsonData.length === 0) {
          toast.error('File Excel kosong atau format tidak sesuai.');
          return;
        }

        setImportProgress({ isImporting: true, current: 0, total: jsonData.length });

        let importedCount = 0;
        for (const row of jsonData) {
          const keys = Object.keys(row);
          let rowNama = 'Tanpa Nama';
          let rowAttrs = {};

          keys.forEach(key => {
            const lowerKey = key.toLowerCase().trim();
            if (lowerKey === 'nama' || lowerKey === 'nama lengkap') {
              rowNama = row[key] || rowNama;
            } else {
              if (row[key] !== "") {
                rowAttrs[lowerKey.replace(/\s+/g, '_')] = row[key].toString();
              }
            }
          });

          await addMasterItem({
            nama: rowNama,
            attributes: rowAttrs
          });
          importedCount++;
          setImportProgress({ isImporting: true, current: importedCount, total: jsonData.length });
          
          // Small delay to allow UI to render progress smoothly for very fast DBs
          await new Promise(resolve => setTimeout(resolve, 5));
        }

        setTimeout(() => {
          triggerToast('Import Sukses!', `Berhasil mengimpor ${importedCount} data dari Excel!`);
          setImportProgress({ isImporting: false, current: 0, total: 0 });
          if (onMasterUpdated) onMasterUpdated();
        }, 500);
      } catch (error) {
        console.error("Error importing Excel:", error);
        toast.error('Terjadi kesalahan saat membaca file Excel. Pastikan formatnya benar.');
        setImportProgress({ isImporting: false, current: 0, total: 0 });
      } finally {
        e.target.value = null; // reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex flex-col font-sans relative">
      
      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-purple-400/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      {/* Main Glass Container */}
      <div className="flex-1 flex flex-col h-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-5 lg:p-6 relative z-10 overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Database Users</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Kelola data pengguna, organisasi, atau kontak secara massal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleImportExcel} 
              ref={fileInputRef} 
              className="hidden" 
            />
            
            <div className="relative group">
              <button className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-1 active:scale-[0.98]">
                <Plus size={18} />
                Tambah Data
              </button>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden pt-1">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-colors border-b border-slate-100"
                >
                  <Keyboard size={16} /> Input Manual
                </button>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-3 transition-colors"
                >
                  <FileSpreadsheet size={16} /> Import Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors shadow-sm animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <Trash size={14} /> Hapus Terpilih ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Modern Table Layout */}
        <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200/60 rounded-2xl bg-white shadow-inner relative">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 shadow-sm">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60">
                <th className="px-4 py-3.5 w-12 text-center border-r border-slate-100/50">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={masterData?.length > 0 && selectedIds.length === masterData.length}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                  />
                </th>
                <th className="px-4 py-3.5 w-16 text-center border-r border-slate-100/50">No</th>
                <th className="px-4 py-3.5 border-r border-slate-100/50">Nama Lengkap</th>
                <th className="px-4 py-3.5 border-r border-slate-100/50">Atribut & Detail (Singkat)</th>
                <th className="px-4 py-3.5 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {masterData && masterData.map((item, index) => {
                const isSelected = selectedIds.includes(item.id);
                // Create a brief summary string of attributes
                const attrCount = Object.keys(item.attributes || {}).length;
                
                return (
                <tr 
                  key={item.id} 
                  onClick={() => setDetailModalItem(item)}
                  className={`group hover:bg-indigo-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 text-center border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(e, item.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-400 text-center border-r border-slate-50">{index + 1}</td>
                  <td className="px-4 py-3 border-r border-slate-50">
                    <div className="font-bold text-slate-700 truncate max-w-[200px] xl:max-w-[300px]" title={item.nama}>
                      {item.nama}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-50 w-full max-w-0">
                    <div className="text-[11px] font-semibold text-slate-500 truncate">
                      {attrCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {attrCount} atribut tersimpan
                        </span>
                      ) : (
                        <span className="italic text-slate-300">Tidak ada atribut khusus</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDetailModalItem(item); }}
                        className="text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors inline-flex border border-transparent hover:border-indigo-100 shadow-sm"
                        title="Lihat Detail Profil"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              
              {(!masterData || masterData.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-4 py-16 text-center bg-slate-50/30">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-slate-300 mb-3 shadow-sm border border-slate-100">
                      <Database size={28} />
                    </div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Database Masih Kosong</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Tambahkan atau import data pengguna baru.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Info - Premium Redesign */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDetailModalItem(null)}></div>
          <div className="bg-white w-full max-w-md rounded-2xl p-0 shadow-2xl relative z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-200">
            
            {/* Header Area */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-start justify-between shrink-0">
              <div>
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-200 shadow-sm">
                  <Database size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{detailModalItem.nama}</h3>
                <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Profil Pengguna</p>
              </div>
              <button onClick={() => setDetailModalItem(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-white border border-slate-200 shadow-sm">
                <X size={16} />
              </button>
            </div>
            
            {/* Attributes Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(detailModalItem.attributes || {}).map(key => (
                  <div key={key} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-bold text-slate-800 break-words">{detailModalItem.attributes[key]}</span>
                  </div>
                ))}
              </div>
              
              {(!detailModalItem.attributes || Object.keys(detailModalItem.attributes).length === 0) && (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50">
                  <p className="text-xs text-slate-500 font-medium italic">Data ini hanya memiliki Nama tanpa atribut tambahan.</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
              <button 
                onClick={() => setDetailModalItem(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors shadow-sm w-full"
              >
                Tutup Profil
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Input Entitas Baru - Ultra Premium */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-lg rounded-[2rem] p-6 shadow-2xl relative z-10 border border-white/50 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Tambah Data Baru</h3>
                  <p className="text-[11px] font-bold text-slate-500">Rekam biodata pengguna atau kontak.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveMaster} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto pr-2 pb-4 space-y-4 flex-1 custom-scrollbar">
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 px-1">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={nama} 
                      onChange={(e) => setNama(e.target.value)} 
                      required 
                      className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800 text-sm outline-none shadow-inner"
                      placeholder="Contoh: Budi Santoso..." 
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/30 rounded-2xl p-4 border border-indigo-100/50 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      Kolom Atribut Dinamis (Key-Value)
                    </label>
                    <button 
                      type="button" 
                      onClick={handleAddAttributeRow} 
                      className="text-indigo-600 font-bold text-[10px] uppercase tracking-wider hover:text-indigo-700 bg-white border border-indigo-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm self-start sm:self-auto"
                    >
                      <Plus size={12} /> Tambah Kolom
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {attributes.map((attr, idx) => (
                      <div key={idx} className="flex gap-2 items-center group">
                        <input
                          type="text"
                          placeholder="Variabel (misal: nik)"
                          value={attr.key}
                          onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)}
                          className="flex-[1.5] px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs font-mono font-bold text-slate-700 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Isi data..."
                          value={attr.value}
                          onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                          className="flex-[2] px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs font-bold text-slate-800 outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAttributeRow(idx)} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 border border-transparent group-hover:border-red-100 bg-white"
                          title="Hapus Kolom"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                    {attributes.length === 0 && (
                      <p className="text-center text-slate-400 text-[10px] font-bold italic py-4 bg-white/50 rounded-xl border border-dashed border-slate-200">Tidak ada atribut khusus.</p>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-colors"
                >
                  Batalkan
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-xs font-black shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleek Progress Overlay */}
      {importProgress.isImporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>
          
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-300">
             
             {/* Progress spinner */}
             <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent"
                  style={{ animationDuration: '1.5s' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-indigo-500 animate-pulse" />
                </div>
             </div>

             <h3 className="text-lg font-black text-slate-800 mb-1">Menyimpan Data...</h3>
             <p className="text-sm font-medium text-slate-500 mb-6 text-center">
               Mohon tunggu, jangan tutup aplikasi.
             </p>

             {/* Bar */}
             <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out relative"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                >
                   <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite_linear]"></div>
                </div>
             </div>
             <div className="w-full flex justify-between items-center mt-2 px-1">
                <span className="text-[11px] font-bold text-slate-400">
                  {importProgress.current} / {importProgress.total} baris
                </span>
                <span className="text-[11px] font-black text-indigo-600">
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
             </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-300 slide-in-from-bottom-8">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-red-50 text-red-500 shadow-red-500/20' : 'bg-indigo-50 text-indigo-500 shadow-indigo-500/20'} shadow-lg`}>
              {confirmConfig.type === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmConfig.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-8">{confirmConfig.desc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 ${confirmConfig.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
              >
                {confirmConfig.type === 'danger' ? <Trash size={18} /> : <Check size={18} />}
                {confirmConfig.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
