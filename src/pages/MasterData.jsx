import React, { useState, useRef } from 'react';
import { addMasterItem, deleteMasterItem, bulkDeleteMasterItems, deleteAllMasterItems } from '../services/db';
import { Plus, Trash, Database, Save, Upload, FileSpreadsheet, Download, Info, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function MasterData({ masterData, onMasterUpdated }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  
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

    if (onMasterUpdated) onMasterUpdated();

    setIsModalOpen(false);
    setNama('');
    setAttributes([]);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus data user ini?')) {
      await deleteMasterItem(id);
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      if (onMasterUpdated) onMasterUpdated();
    }
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
    if (window.confirm(`Hapus ${selectedIds.length} data terpilih secara permanen?`)) {
      await bulkDeleteMasterItems(selectedIds);
      setSelectedIds([]);
      if (onMasterUpdated) onMasterUpdated();
    }
  };

  const handleDeleteAll = async () => {
    if (!masterData || masterData.length === 0) return;
    if (window.confirm('PERINGATAN: Anda yakin ingin menghapus SELURUH data user secara permanen? Tindakan ini tidak dapat dibatalkan!')) {
      await deleteAllMasterItems();
      setSelectedIds([]);
      if (onMasterUpdated) onMasterUpdated();
    }
  };

  const fileInputRef = useRef(null);

  const downloadSampleExcel = () => {
    const wsData = [
      ["Nama Lengkap", "NIK", "Jabatan", "No Telepon", "Alamat"],
      ["Budi Santoso", "3201111122223333", "Manajer", "081234567890", "Jl. Merdeka No.1"],
      ["Siti Aminah", "3201111122223334", "Staf Administrasi", "081987654321", "Jl. Sudirman No.5"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto size columns
    const wscols = [
      {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 30}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Import");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "Format_Import_Data.xlsx");
  };

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
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        // Parse and insert each row sequentially to not overwhelm DB, or better do bulk insert (but this is fine for small files)
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
        }

        alert(`Berhasil mengimpor ${importedCount} data dari Excel!`);
        if (onMasterUpdated) onMasterUpdated();
        setIsImportModalOpen(false);
      } catch (error) {
        console.error("Error importing Excel:", error);
        alert('Terjadi kesalahan saat membaca file Excel. Pastikan formatnya benar.');
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

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-3 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              title="Import data dari Excel (.xlsx)"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline">Import Excel</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-1 active:scale-[0.98]"
            >
              <Plus size={18} />
              User Baru
            </button>
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
                const attrs = Object.keys(item.attributes || {}).map(k => `${k.replace(/_/g, ' ')}: ${item.attributes[k]}`).join('  |  ');
                
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
                    <div className="text-[11px] font-semibold text-slate-500 truncate" title={attrs}>
                      {attrs || <span className="italic text-slate-300">Tidak ada atribut khusus</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex border border-transparent hover:border-rose-100 shadow-sm opacity-50 group-hover:opacity-100"
                      title="Hapus Baris Ini"
                    >
                      <Trash size={14} />
                    </button>
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
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Informasi Atribut</h4>
              
              <div className="space-y-4">
                {Object.keys(detailModalItem.attributes || {}).map(key => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="w-full sm:w-1/3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{key.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="w-full sm:w-2/3">
                      <p className="text-[13px] font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{detailModalItem.attributes[key]}</p>
                    </div>
                  </div>
                ))}
                
                {(!detailModalItem.attributes || Object.keys(detailModalItem.attributes).length === 0) && (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50">
                    <p className="text-xs text-slate-500 font-medium italic">Data ini hanya memiliki Nama tanpa atribut tambahan.</p>
                  </div>
                )}
              </div>
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

      {/* Modal Import Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsImportModalOpen(false)}></div>
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-lg rounded-[2rem] p-6 shadow-2xl relative z-10 border border-white/50 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Import dari Excel</h3>
                  <p className="text-[11px] font-bold text-slate-500">Tambahkan data massal dengan mudah.</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto pr-2 pb-4 space-y-4 flex-1 custom-scrollbar">
                
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 relative overflow-hidden">
                  <Info size={80} className="absolute -right-4 -bottom-4 text-blue-500 opacity-5 pointer-events-none" />
                  <h4 className="font-black text-blue-900 text-xs mb-2 flex items-center gap-2 relative z-10">
                    Cara Menggunakan Fitur Import:
                  </h4>
                  <ul className="text-[10px] text-blue-800 font-bold space-y-2 list-disc list-inside relative z-10">
                    <li>Baris pertama di Excel akan dianggap sebagai <strong>Nama Kolom (Variabel)</strong>.</li>
                    <li>Wajib memiliki kolom bernama <strong>"Nama Lengkap"</strong> atau <strong>"Nama"</strong>.</li>
                    <li>Kolom sisanya (seperti NIK, Alamat, No HP) akan otomatis ditambahkan sebagai atribut dinamis tanpa batas!</li>
                  </ul>
                  
                  <button 
                    onClick={downloadSampleExcel}
                    className="mt-4 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2 relative z-10"
                  >
                    <Download size={14} /> Unduh Format Template Excel (.xlsx)
                  </button>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-center border-dashed">
                  <Upload size={32} className="text-emerald-500 mx-auto mb-3" />
                  <h4 className="font-black text-emerald-900 text-sm mb-1">Upload File Anda Disini</h4>
                  <p className="text-[10px] text-emerald-700/70 font-bold mb-4">Mendukung format .xlsx, .xls, atau .csv</p>
                  
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleImportExcel} 
                    ref={fileInputRef} 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
                  >
                    Pilih File Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
