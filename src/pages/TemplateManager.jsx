import React, { useState, useRef } from 'react';
import { parseTemplateVariables, extractTextFromDocx } from '../utils/templateEngine';
import { saveTemplate, deleteTemplate, bulkDeleteTemplates, triggerReload, triggerToast } from '../services/db';
import { toast } from 'sonner';
import { Plus, Trash, FileText, Upload, Save, X, FileBadge, Edit3, Eye, AlertTriangle, Info, Check } from 'lucide-react';

export default function TemplateManager({ templates, onTemplatesUpdated }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', desc: '', actionLabel: '', onConfirm: null, type: 'danger' });
  const [editingId, setEditingId] = useState(null);
  const [namaTemplate, setNamaTemplate] = useState('');
  const [konten, setKonten] = useState('');
  
  // File states for native .docx templating
  const [isDocxTemplate, setIsDocxTemplate] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');

  // States for Manual Template enhancements
  const [ukuranKertas, setUkuranKertas] = useState('A4');
  const [kopSuratBase64, setKopSuratBase64] = useState('');
  const [kopSuratName, setKopSuratName] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked && templates) {
      setSelectedTemplateIds(templates.map(t => t.id));
    } else {
      setSelectedTemplateIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedTemplateIds(prev => [...prev, id]);
    } else {
      setSelectedTemplateIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTemplateIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: `Hapus ${selectedTemplateIds.length} template terpilih?`,
      desc: 'Template yang dipilih akan dihapus secara permanen.',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Template', subtitle: 'Membuang data ke tempat sampah...' } }));
        setTimeout(async () => {
          try {
            await bulkDeleteTemplates(selectedTemplateIds);
            setSelectedTemplateIds([]);
            if (onTemplatesUpdated) onTemplatesUpdated();
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => triggerToast('Berhasil!', `${selectedTemplateIds.length} template berhasil dihapus.`), 300);
          } catch (e) {
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => toast.error('Gagal menghapus template'), 300);
          }
        }, 1500);
      }
    });
  };


  const fileInputRef = useRef(null);
  const kopInputRef = useRef(null);

  // Auto-detected variables preview
  const [docxVars, setDocxVars] = useState([]);
  const detectedVars = isDocxTemplate ? docxVars : parseTemplateVariables(konten);

  const resetForm = () => {
    setEditingId(null);
    setNamaTemplate('');
    setKonten('');
    setIsDocxTemplate(false);
    setFileName('');
    setFileBase64('');
    setDocxVars([]);
    setUkuranKertas('A4');
    setKopSuratBase64('');
    setKopSuratName('');
  };

  const handleImportDocx = async (e) => {
    // If running in electron, use the native dialog
    if (window.api && window.api.pilihFileDocx) {
      e.preventDefault();
      try {
        const result = await window.api.pilihFileDocx();
        if (result && result.success) {
          setFileName(result.name);
          setFileBase64(result.base64);
          setIsDocxTemplate(true);
          
          const text = result.text || "";
          // Gunakan regex pemaaf: deteksi kurung kurawal berapapun jumlahnya {nama} atau {{nama}}
          const matches = text.match(/\{+([^}]+)\}+/g);
          if (matches) {
            const vars = [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))];
            setDocxVars(vars);
          } else {
            setDocxVars([]);
          }
          
          setKonten(result.htmlPreview || result.text || text || '');
          
          // Jika tidak sedang mengedit (isEditMode false), maka ambil nama dari file docx
          if (!editingId) {
            setNamaTemplate(result.name.replace('.docx', ''));
          }
          setIsModalOpen(true);
          // triggerToast removed based on user request (only show when saving)
        } else if (result && result.error) {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error("Gagal membaca file .docx!");
        console.error(err);
      }
      return;
    }

    // Fallback for web browser
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const base64String = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        setFileBase64(base64String);
        setIsDocxTemplate(true);
        
        const text = await extractTextFromDocx(file);
        const matches = text.match(/\{+([^}]+)\}+/g);
        if (matches) {
          const vars = [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))];
          setDocxVars(vars);
        } else {
          setDocxVars([]);
        }
        
        // As fallback for web browser, we only have raw text
        setKonten(text || '');
        if (!editingId) {
          setNamaTemplate(file.name.replace('.docx', ''));
        }
        if (onTemplatesUpdated) onTemplatesUpdated();
        // triggerToast removed based on user request (only show when saving)
      } catch (err) {
        toast.error("Gagal membaca file .docx!");
        console.error(err);
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleKopSuratUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar (JPG/PNG).');
      return;
    }

    setKopSuratName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setKopSuratBase64(evt.target.result); // Store as full Base64 Data URL
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();

    const templateData = {
      id: editingId, // akan mengirim undefined jika null (Buat Baru)
      nama_template: namaTemplate,
      konten: konten,
      variables: detectedVars,
      is_docx: isDocxTemplate,
      file_name: fileName,
      file_base64: fileBase64,
      ukuran_kertas: ukuranKertas,
      kop_surat_base64: kopSuratBase64
    };

    try {
      setIsModalOpen(false); // Tutup modal duluan biar kelihatan progressnya
      window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'upload', title: 'Mengunggah Template', subtitle: 'Proses uploading ke Nebula Envelope...' } }));
      
      setTimeout(async () => {
        try {
          await saveTemplate(templateData);
          if (onTemplatesUpdated) onTemplatesUpdated();
          resetForm();
          const msg = editingId ? 'Template berhasil diperbarui!' : 'Template berhasil diunggah!';
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => triggerToast('Berhasil!', msg), 300);
        } catch (error) {
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => toast.error("Gagal mengunggah template."), 300);
        }
      }, 1500);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('hide-processing'));
      setTimeout(() => toast.error("Terjadi kesalahan sistem."), 300);
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setNamaTemplate(t.nama_template || '');
    setKonten(t.konten || '');
    setDocxVars(t.variables || []);
    setIsDocxTemplate(t.is_docx === 1 || t.is_docx === true);
    setFileName(t.file_name || '');
    setUkuranKertas(t.ukuran_kertas || 'A4');
    
    // Jangan muat base64 lama ke state, biarkan backend yang menahannya jika tidak ada pembaruan
    setFileBase64(''); 
    setKopSuratBase64(''); 
    setKopSuratName('');
    
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: 'Hapus template?',
      desc: 'Apakah Anda yakin ingin menghapus template ini secara permanen?',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Template', subtitle: 'Menghapus data dari sistem...' } }));
        setTimeout(async () => {
          await deleteTemplate(id);
          window.dispatchEvent(new CustomEvent('hide-processing'));
          if (onTemplatesUpdated) onTemplatesUpdated();
          setTimeout(() => {
            triggerToast('Sukses!', 'Template berhasil dihapus.');
          }, 300);
        }, 1500);
      }
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col font-sans bg-transparent animate-in fade-in duration-500 w-full h-full overflow-hidden relative">
      
      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-purple-400/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="flex-1 flex flex-col h-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-5 lg:p-6 relative z-10 overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Template Dokumen</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Kelola dan edit format dokumen surat Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedTemplateIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Trash size={18} />
                <span className="hidden sm:inline">Hapus Terpilih ({selectedTemplateIds.length})</span>
              </button>
            )}

            <input 
              type="file" 
              accept=".docx" 
              onChange={handleImportDocx} 
              ref={fileInputRef} 
              className="hidden" 
            />
            
            <div className="relative group">
              <button className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-1 active:scale-[0.98]">
                <Plus size={18} />
                Tambah Template
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden pt-1">
                <button
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 border-b border-slate-100"
                >
                  <FileText size={16} /> Input Manual
                </button>
                <button
                  onClick={(e) => {
                    resetForm();
                    if (window.api && window.api.pilihFileDocx) {
                      handleImportDocx(e);
                    } else {
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3"
                >
                  <FileBadge size={16} /> Import DOCX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Table Layout */}
        <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200/60 rounded-2xl bg-white shadow-inner relative">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 shadow-sm">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200/60">
                <th className="px-4 py-3.5 w-10 text-center border-r border-slate-100/50">
                  <input type="checkbox" onChange={handleSelectAll} checked={templates && templates.length > 0 && selectedTemplateIds.length === templates.length} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </th>
                <th className="px-4 py-3.5 w-16 text-center border-r border-slate-100/50">No</th>
                <th className="px-4 py-3.5 border-r border-slate-100/50">Nama & Jenis Template</th>
                <th className="px-4 py-3.5 border-r border-slate-100/50">Jumlah Variabel</th>
                <th className="px-4 py-3.5 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {templates && templates.map((t, index) => {
                const isDocx = t.is_docx === 1 || t.is_docx === true;
                const varCount = t.variables ? t.variables.length : 0;
                
                return (
                <tr 
                  key={t.id} 
                  className={`group transition-colors bg-white ${selectedTemplateIds.includes(t.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}
                >
                  <td className="px-4 py-4 text-center border-r border-slate-50">
                    <input type="checkbox" checked={selectedTemplateIds.includes(t.id)} onChange={(e) => handleSelectOne(e, t.id)} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-400 text-center border-r border-slate-50">{index + 1}</td>
                  
                  <td className="px-4 py-4 border-r border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${isDocx ? 'bg-blue-50 border-blue-100 text-blue-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        {isDocx ? <FileBadge size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{t.nama_template}</span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                          {isDocx ? 'Microsoft Word (.docx)' : 'Teks Manual'}
                          {isDocx && t.file_name && <span className="italic opacity-70">({t.file_name})</span>}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 border-r border-slate-50">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm text-[10px]">
                      {varCount} Tag
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-all border border-transparent hover:border-emerald-100 shadow-sm"
                        title="Edit Template"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              
              {(!templates || templates.length === 0) && (
                <tr>
                  <td colSpan="4" className="px-4 py-16 text-center bg-slate-50/30">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-slate-300 mb-3 shadow-sm border border-slate-100">
                      <FileText size={28} />
                    </div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Belum Ada Template</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Tambahkan template manual atau import DOCX.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Modal Input/Edit Template - Ultra Premium */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-lg rounded-[2rem] p-6 shadow-2xl relative z-10 border border-white/50 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg ${editingId ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'}`}>
                  {editingId ? <Edit3 size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingId ? 'Edit Template' : 'Tambah Template'}</h3>
                  <p className="text-[11px] font-bold text-slate-500">{editingId ? 'Modifikasi template yang sudah ada.' : 'Buat template dokumen kustom.'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTemplate} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto pr-2 pb-4 space-y-4 flex-1 custom-scrollbar">
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 px-1">Nama / Jenis Template</label>
                    <input 
                      type="text" 
                      value={namaTemplate} 
                      onChange={(e) => setNamaTemplate(e.target.value)} 
                      required 
                      className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800 text-sm outline-none shadow-inner"
                      placeholder="Misal: Surat Keterangan Lulus" 
                    />
                  </div>
                </div>

                {isDocxTemplate ? (
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-200/50 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-blue-200 relative z-10">
                      <FileBadge size={32} />
                    </div>
                    <p className="text-sm font-black text-blue-900 relative z-10">
                      {fileName || 'Dokumen Word Asli Tersimpan'}
                    </p>
                    <p className="text-xs font-bold text-blue-600/80 mt-1.5 max-w-xs relative z-10">Template ini dieksekusi secara native menggunakan mesin Microsoft Word.</p>
                    
                    {editingId && (
                      <div className="mt-4 pt-4 border-t border-blue-100 w-full relative z-10">
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.api && window.api.pilihFileDocx) {
                              handleImportDocx(new Event('click')); // Trigger re-import
                            } else {
                              fileInputRef.current.click();
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-colors"
                        >
                          Ganti File / Upload Ulang
                        </button>
                      </div>
                    )}

                    {!editingId && (
                      <button 
                        type="button"
                        onClick={() => { setIsDocxTemplate(false); setFileName(''); setFileBase64(''); setDocxVars([]); setIsModalOpen(false); }}
                        className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-[10px] font-bold hover:bg-red-50 transition-colors relative z-10 shadow-sm"
                      >
                        Batal Gunakan File Ini
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 px-1">Gambar Kop Surat (Opsional)</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleKopSuratUpload} 
                          ref={kopInputRef} 
                          className="hidden" 
                        />
                        <button 
                          type="button"
                          onClick={() => kopInputRef.current.click()}
                          className={`w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all font-bold text-xs flex items-center justify-center gap-2 ${kopSuratBase64 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'}`}
                        >
                          <Upload size={14} />
                          {kopSuratName || (editingId ? 'Timpa Kop Baru' : 'Unggah JPG/PNG')}
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 px-1">Ukuran Kertas</label>
                        <select 
                          value={ukuranKertas}
                          onChange={(e) => setUkuranKertas(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800 text-sm outline-none shadow-inner"
                        >
                          <option value="A4">A4 (210 x 297 mm)</option>
                          <option value="F4">F4 / Folio (215.9 x 330.2 mm)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 px-1">
                        Isi Draf Template (Mode Teks Biasa)
                      </label>
                      <p className="text-[10px] font-bold text-slate-400 mb-2 px-1">Ketik <code className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono">{'{{variabel}}'}</code> untuk isian otomatis.</p>
                      <textarea 
                        value={konten} 
                        onChange={(e) => setKonten(e.target.value)} 
                        className="w-full h-32 px-4 py-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-indigo-500 transition-all text-xs font-serif leading-relaxed text-slate-800 shadow-inner resize-none outline-none"
                        placeholder={`SURAT RESMI\nNomor: {{nomor_surat}}\n\nDengan ini menerangkan bahwa:\nNama: {{nama}}\nNISN: {{nisn}}\n...`} 
                      />
                    </div>
                  </div>
                )}

                {/* Live Tag Detector */}
                <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                  <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Variabel Terdeteksi Otomatis</span>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{detectedVars.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedVars.length > 0 ? (
                      detectedVars.map(v => (
                        <span key={v} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 font-mono font-bold shadow-sm">
                          {`{{${v}}}`}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold italic">Tidak ada variabel terdeteksi.</span>
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
                  className={`flex-1 py-3 rounded-xl text-white text-xs font-black shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 ${editingId ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-orange-500/25' : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-indigo-500/25'}`}
                >
                  <Save size={16} />
                  {editingId ? 'Simpan Perubahan' : 'Simpan Template'}
                </button>
              </div>
            </form>
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
