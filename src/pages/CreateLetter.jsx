import React, { useState, useEffect, useMemo } from 'react';
import { parseTemplateVariables, populateTemplate, formatVariableLabel, generateNativeDocx } from '../utils/templateEngine';
import { parseNumberingFormat, generateLetterNumber, getAutoNumberingValues } from '../utils/numberingEngine';
import { saveOutgoingLetter, API_BASE_URL, triggerToast } from '../services/db';
import { Save, Calendar, Printer, FileText, CheckCircle2, ChevronRight, Zap, Eye, Settings2, Lock, FileBadge, Download, Search, X, Users, PenLine, Hash, BellRing, ChevronDown } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export default function CreateLetter({ templates, masterData, settings, onLetterCreated, outgoingCount, onOpenFolderPicker, onViewDocument, isSidebarOpen }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form States
  const [variables, setVariables] = useState([]);
  const [formData, setFormData] = useState({});
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [masterSearch, setMasterSearch] = useState('');
  const [isMasterDropdownOpen, setIsMasterDropdownOpen] = useState(false);
  const allFilteredData = useMemo(() => {
    return masterData.filter(m =>
      m.nama.toLowerCase().includes(masterSearch.toLowerCase()) ||
      (m.kategori && m.kategori.toLowerCase().includes(masterSearch.toLowerCase()))
    );
  }, [masterData, masterSearch]);

  const filteredMasterData = allFilteredData.slice(0, 50);
  const hasMoreMasterData = allFilteredData.length > 50;

  // Numbering States
  const defaultFormat = settings?.format_nomor_default || '{NO_URUT}/SURAT/{BULAN_ROMAWI}/{TAHUN}';
  const numberingVars = useMemo(() => parseNumberingFormat(defaultFormat), [defaultFormat]);
  const [numberingData, setNumberingData] = useState({});
  const [isManualNumber, setIsManualNumber] = useState(false);
  const [manualNumberInput, setManualNumberInput] = useState('');

  // Save & Print Logic
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Lock Logic
  const [lockedFields, setLockedFields] = useState([]);

  // Action Logic
  const [actionPrint, setActionPrint] = useState(false);
  const [actionConvert, setActionConvert] = useState(false);

  const resetSaveState = () => setIsSaved(false);

  // Sync Template
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
      return;
    }
    const t = templates.find(item => String(item.id) === String(selectedTemplateId));
    if (t) {
      setSelectedTemplate(t);
      const vars = t.variables && t.variables.length > 0
        ? t.variables
        : (!t.is_docx ? parseTemplateVariables(t.konten) : []);
      setVariables(vars);
      const initForm = { ...formData };
      vars.forEach(v => {
        if (initForm[v] === undefined) initForm[v] = '';
      });
      setFormData(initForm);
      setLockedFields([]);
      resetSaveState();
    }
  }, [selectedTemplateId, templates]);

  const paperSize = selectedTemplate?.ukuran_kertas === 'F4' ? 'F4' : 'A4';

  // Sync Auto Number
  useEffect(() => {
    const counter = settings?.counter_surat_keluar || 0;
    const newNumberingValues = getAutoNumberingValues(counter + 1);

    setNumberingData(prev => {
      const merged = { ...prev };
      numberingVars.forEach(v => {
        if (newNumberingValues[v] !== undefined) {
          merged[v] = newNumberingValues[v];
        } else if (merged[v] === undefined) {
          merged[v] = '';
        }
      });
      return merged;
    });
  }, [settings?.counter_surat_keluar, numberingVars]);

  const handleInputChange = (varName, value) => {
    setFormData(prev => ({ ...prev, [varName]: value }));
    resetSaveState();
  };

  const handleNumberingChange = (varName, value) => {
    setNumberingData(prev => ({ ...prev, [varName]: value }));
    resetSaveState();
  };

  const handleSelectMasterEntity = (e) => {
    const masterId = e.target.value;
    setSelectedMasterId(masterId);
    resetSaveState();

    if (!masterId) {
      setLockedFields([]);
      return;
    }

    const entity = masterData.find(item => String(item.id) === String(masterId));
    if (entity) {
      const newLocked = [];
      setFormData(prev => {
        const updated = { ...prev };
        if (entity.nama && variables.includes('nama')) {
          updated['nama'] = entity.nama;
          newLocked.push('nama');
        }
        if (entity.attributes) {
          Object.keys(entity.attributes).forEach(attrKey => {
            if (variables.includes(attrKey)) {
              updated[attrKey] = entity.attributes[attrKey];
              newLocked.push(attrKey);
            }
          });
        }
        return updated;
      });
      setLockedFields(newLocked);
    }
  };

  const setTodayDate = (varName) => {
    const today = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const formatted = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`;
    const isPlaceAndDate = varName.toLowerCase().includes('tempat') || (varName.toLowerCase().includes('tanggal') && varName.toLowerCase().includes('buat'));
    const finalValue = isPlaceAndDate ? `Caruy, ${formatted}` : formatted;
    handleInputChange(varName, finalValue);
  };

  const generatedNumber = isManualNumber ? manualNumberInput : generateLetterNumber(defaultFormat, numberingData);
  const generatedContent = populateTemplate(selectedTemplate?.konten || '', {
    ...formData,
    nomor_surat: generatedNumber
  });

  const handleSave = async (e, actionType = 'save') => {
    if (e) e.preventDefault();
    setIsSaving(true);
    const folderTarget = settings?.folder_surat_keluar || 'D:/data/surat/keluar';
    const finalFormData = { ...formData, nomor_surat: generatedNumber };

    if (settings?.enable_qrcode === 1) {
      try {
        let serverIp = '127.0.0.1';
        try {
          const ipRes = await fetch(`${API_BASE_URL}/ip`);
          const ipData = await ipRes.json();
          serverIp = ipData.ip || '127.0.0.1';
        } catch (err) { }

        const payloadObj = {
          nomor: finalFormData.nomor_surat || 'Draft',
          timestamp: Date.now()
        };
        const token = btoa(JSON.stringify(payloadObj));
        const qrData = `http://${serverIp}:${settings?.server_port || 8080}/verify?token=${token}`;
        const qrBase64 = await QRCode.toDataURL(qrData);
        finalFormData.qrcode = qrBase64;
        finalFormData['%qrcode'] = qrBase64;
      } catch (e) { }
    }

    const safeNumber = (generatedNumber || '000').replace(/[\/\\]/g, '_');
    const perihalText = finalFormData.perihal ? finalFormData.perihal.replace(/[^a-zA-Z0-9\s]/g, '').trim() : 'Surat Keluar';
    const generatedFileName = `${safeNumber}_${perihalText}`;

    let finalKonten = generatedContent;
    let fileBase64 = null;
    let filePath = null;

    if (selectedTemplate?.is_docx && selectedTemplate.file_base64) {
      try {
        fileBase64 = await generateNativeDocx(selectedTemplate.file_base64, finalFormData, generatedFileName);
        finalKonten = '[File DOCX Generated]';
        // Note: Anda harus menyesuaikan generateNativeDocx untuk mengembalikan full path file yang disimpan
        filePath = `${folderTarget}/${generatedFileName}.docx`;
      } catch (error) {
        toast.error(error.message || "Gagal memproses file Word.");
        setIsSaving(false);
        return;
      }
    }

    const letterRecord = {
      nomor_surat: generatedNumber,
      nama_template: selectedTemplate?.nama_template || 'Surat Kustom',
      perihal: finalFormData.perihal || '',
      nama_file: generatedFileName,
      formData: finalFormData,
      konten: finalKonten,
      file_base64: fileBase64,
      is_docx: !!selectedTemplate?.is_docx,
      folder_tersimpan: folderTarget
    };

    await saveOutgoingLetter(letterRecord);
    setIsSaved(true);
    setIsSaving(false);



    // JEDA WAKTU PENTING UNTUK AUTO-PRINT
    setTimeout(async () => {
       let actionMessage = 'Surat berhasil disimpan.';
       
       if (actionPrint) {
         if (!selectedTemplate?.is_docx) {
           window.print();
           actionMessage = 'Surat berhasil disimpan & dicetak.';
         } else {
           if (window.api && window.api.cetakSuratFisik) {
             window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'print', title: 'Mencetak Dokumen...', subtitle: 'Mengirim dokumen ke mesin printer.' } }));
             const res = await window.api.cetakSuratFisik(filePath);
             window.dispatchEvent(new CustomEvent('hide-processing'));
             if (res.success) {
               actionMessage = 'Surat DOCX berhasil dikirim ke Printer.';
             } else {
               window.dispatchEvent(new CustomEvent('show-toast', { detail: { title: 'Gagal Cetak', message: res.error, type: 'error' } }));
             }
           }
         }
       }
       
       if (actionConvert) {
         if (selectedTemplate?.is_docx) {
           const secretKey = "LkAHyYTrm2Ef800RLFyoYYlqlmnRF6Uj";
           toast.loading('Konversi PDF...', { description: 'Menghubungkan ke ConvertAPI...', id: 'pdf-convert' });
           try {
             const localFileRes = await fetch(`${API_BASE_URL}/download?path=${encodeURIComponent(filePath)}`);
             if (!localFileRes.ok) throw new Error("Gagal membaca dokumen asli.");
             const fileBlob = await localFileRes.blob();

             const formData = new FormData();
             formData.append('File', fileBlob, generatedFileName + '.docx');
             formData.append('StoreFile', 'true');

             const convertRes = await fetch('https://v2.convertapi.com/convert/docx/to/pdf', {
               method: 'POST',
               headers: { 'Authorization': `Bearer ${secretKey}` },
               body: formData
             });

             if (!convertRes.ok) throw new Error('Konversi ditolak oleh server ConvertAPI.');
             const result = await convertRes.json();
             if (result.Files && result.Files.length > 0) {
               const pdfUrl = result.Files[0].Url;
               const pdfRes = await fetch(pdfUrl);
               const pdfBlob = await pdfRes.blob();
               const reader = new FileReader();
               reader.readAsDataURL(pdfBlob);
               reader.onloadend = async () => {
                 const base64data = reader.result.split(',')[1];
                 const finalPdfName = `${generatedFileName}.pdf`;
                 if (window.api && window.api.saveFile) {
                   await window.api.saveFile({
                     folderPath: folderTarget,
                     fileName: finalPdfName,
                     fileData: base64data,
                     isBase64: true
                   });
                   toast.dismiss('pdf-convert');
                 }
               };
             } else {
               throw new Error('Hasil konversi kosong.');
             }
           } catch (error) {
             let errorMsg = error.message;
             if (errorMsg && errorMsg.includes('Failed to fetch')) errorMsg = "Gagal terhubung ke server konversi. Harap periksa koneksi internet Anda.";
             toast.error('Gagal Konversi', { id: 'pdf-convert', description: errorMsg });
           }
         } else {
           toast.error('Format Tidak Didukung', { description: 'Konversi PDF saat ini hanya mendukung format DOCX.' });
         }
       }
       
       triggerToast('Sukses!', actionMessage);
    }, 500);

    if (onLetterCreated) onLetterCreated();
  };

  const handlePrint = () => {
    if (selectedTemplate?.is_docx) {
      alert("Cetak manual DOCX hanya bisa dari File Explorer atau via integrasi IPC Electron.");
      return;
    }
    window.print();
  };

  return (
    <>
      <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex flex-col font-sans pb-28 relative print:hidden">


        {/* Ambient glowing background blobs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-emerald-400/5 rounded-full blur-[120px] translate-x-1/3 pointer-events-none"></div>

        {/* Header */}
        <div className="px-8 py-6 shrink-0 relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Studio Surat Baru</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Konfigurasi dan lengkapi data dokumen Anda sebelum diterbitkan.</p>
          </div>
        </div>

        {/* Workspace Area: Grid Layout */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-8 relative z-10">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pb-10">

            {/* KOLOM KIRI: Pusat Pengaturan */}
            <div className="lg:col-span-7">
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm flex flex-col relative z-20">

                {/* Step 1: Template */}
                <div className="p-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Pilih Template</h3>
                  </div>
                  <div className="pl-11">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 hover:bg-white transition-all text-xs font-bold text-slate-700 cursor-pointer outline-none"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.nama_template} ({t.kategori || 'Umum'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 2: Nomor Surat */}
                <div className="p-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Hash size={18} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nomor Registrasi</h3>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" checked={isManualNumber} onChange={(e) => { setIsManualNumber(e.target.checked); resetSaveState(); }} className="sr-only" />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${isManualNumber ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isManualNumber ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Manual</span>
                    </label>
                  </div>

                  <div className="pl-11">
                    {isManualNumber ? (
                      <input type="text" value={manualNumberInput} onChange={(e) => { setManualNumberInput(e.target.value); resetSaveState(); }} placeholder="Ketik nomor surat manual..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 bg-white text-xs font-bold font-mono text-slate-700 transition-all outline-none" />
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-5">
                        {numberingVars.filter(v => !(v === 'NO_URUT' || v === 'NO' || v === 'BULAN_ROMAWI' || v === 'BULAN' || v === 'TAHUN')).length > 0 && (
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            {numberingVars.filter(v => !(v === 'NO_URUT' || v === 'NO' || v === 'BULAN_ROMAWI' || v === 'BULAN' || v === 'TAHUN')).map(v => (
                              <div key={v}>
                                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-600">{v}</label>
                                <input type="text" value={numberingData[v] || ''} onChange={(e) => handleNumberingChange(v, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold transition-all outline-none bg-white text-slate-800 focus:border-amber-500" />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bg-slate-800 p-3 rounded-lg text-white text-center font-mono font-bold tracking-widest text-xs border border-slate-700 flex items-center justify-center gap-2">
                          <span className="text-slate-400">#</span> {generatedNumber || 'MEMPROSES...'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Sumber Data (Autofill) */}
                <div className="p-6 relative group bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Sumber Data Pegawai</h3>
                    </div>
                  </div>

                  <div className="relative z-20 pl-11">
                    <div className="relative">
                      <input type="text" placeholder="Ketik nama untuk mencari..." value={masterSearch} onChange={(e) => { setMasterSearch(e.target.value); setIsMasterDropdownOpen(true); }} onFocus={() => setIsMasterDropdownOpen(true)} className="w-full px-4 py-3 pl-11 rounded-xl border border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white text-xs font-bold text-emerald-900 outline-none transition-all placeholder:text-emerald-300" />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400"><Search size={16} /></div>
                      {selectedMasterId && (
                        <button type="button" onClick={() => { handleSelectMasterEntity({ target: { value: '' } }); setMasterSearch(''); setIsMasterDropdownOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 hover:text-white font-bold bg-rose-50 hover:bg-rose-500 p-1.5 rounded-md transition-colors flex items-center justify-center" title="Hapus pilihan"><X size={14} /></button>
                      )}
                    </div>

                    {isMasterDropdownOpen && (
                      <div className="absolute top-full left-11 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar z-50">
                        {filteredMasterData.length === 0 ? (
                          <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Data tidak ditemukan.</div>
                        ) : (
                          <>
                            {filteredMasterData.map(m => (
                              <div key={m.id} onClick={() => { handleSelectMasterEntity({ target: { value: m.id } }); setIsMasterDropdownOpen(false); setMasterSearch(m.nama); }} className="px-5 py-3 hover:bg-emerald-50 border-b border-slate-100 last:border-0 cursor-pointer flex justify-between items-center group transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-700 group-hover:text-emerald-700 transition-colors">{m.nama}</span>
                                  <span className="text-[10px] font-bold text-emerald-500/70">{m.kategori}</span>
                                </div>
                                <ChevronRight size={16} className="text-emerald-300 group-hover:text-emerald-600 transition-all group-hover:translate-x-1" />
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Perihal Dokumen */}
                <div className="p-6 border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <FileBadge size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Perihal Dokumen</h3>
                  </div>
                  <div className="pl-11">
                    <input
                      type="text"
                      value={formData['perihal'] || ''}
                      onChange={(e) => handleInputChange('perihal', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white text-xs font-bold text-slate-800 transition-all outline-none placeholder:text-slate-400"
                      placeholder="Ketik Perihal dokumen..."
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* KOLOM KANAN: Pengisian Data */}
            <div className="lg:col-span-5">
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-3 mb-8 shrink-0 pb-5 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PenLine size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Kanvas Variabel</h3>
                </div>

                <div className="pl-1 lg:pl-11 space-y-6 flex-1">
                  {variables.filter(v => v !== 'nomor_surat' && v !== 'qrcode' && v !== '%qrcode' && v.toLowerCase() !== 'perihal').length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Tidak Ada Variabel Khusus</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {variables.filter(v => v !== 'nomor_surat' && v !== 'qrcode' && v !== '%qrcode' && v.toLowerCase() !== 'perihal').map(varName => {
                        const isDate = varName.toLowerCase().includes('tanggal');
                        const isLocked = lockedFields.includes(varName);

                        return (
                          <div key={varName} className="group">
                            <label className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-slate-700 capitalize tracking-wide flex items-center gap-2">
                                {formatVariableLabel(varName)}
                                {isLocked && (
                                  <button type="button" onClick={() => setLockedFields(prev => prev.filter(f => f !== varName))} className="bg-emerald-100/50 hover:bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-[9px] uppercase tracking-widest flex items-center gap-1 border border-emerald-200/50 transition-colors cursor-pointer font-bold shadow-sm" title="Buka Kunci"><Lock size={10} /> Terkunci</button>
                                )}
                              </span>
                            </label>
                            <div className="relative flex items-center gap-2">
                              <input type="text" readOnly={isLocked} value={formData[varName] || ''} onChange={(e) => handleInputChange(varName, e.target.value)} className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all outline-none ${isLocked ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800'}`} placeholder={isLocked ? 'Auto-filled' : `Ketik ${formatVariableLabel(varName)}...`} />
                              {isDate && !isLocked && (
                                <button type="button" onClick={() => setTodayDate(varName)} className="w-10 h-10 bg-indigo-50 hover:bg-indigo-500 text-indigo-600 hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm" title="Isi Tanggal Hari Ini"><Calendar size={18} /></button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER (Action Bar) */}
        <div className={`fixed bottom-0 right-0 ${isSidebarOpen ? 'lg:left-[280px]' : 'lg:left-[60px]'} left-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 px-6 py-4 lg:py-5 flex items-center justify-center transition-all duration-300`}>
          <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-slate-600 text-xs font-bold">
              {isSaved ? (
                <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                  <CheckCircle2 size={16} /> Berhasil Tersimpan!
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <FileText size={16} className="text-indigo-400" /> Form Siap Disimpan
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {!isSaved ? (
                <>
                  <div className="flex items-center gap-4 mr-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={actionPrint} onChange={(e) => setActionPrint(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-colors" />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">Langsung Cetak</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={actionConvert} onChange={(e) => setActionConvert(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 transition-colors" />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">Konversi PDF</span>
                    </label>
                  </div>
                  <button type="button" onClick={(e) => handleSave(e, 'save')} disabled={isSaving} className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-[11px] sm:text-xs uppercase tracking-widest hover:from-indigo-500 hover:to-blue-500 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0">
                    {isSaving ? (<span className="animate-pulse">Memproses...</span>) : (<> <Save size={18} /> Simpan Surat </>)}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setFormData({}); setIsSaved(false); }} className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-[0.98] border border-slate-200">
                    Buat Surat Baru
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE AREA (Hanya Muncul Saat Print) */}
      <div className="hidden print:block fixed inset-0 z-[99999] bg-white print-container">
        <style>
          {`
          @media print {
            @page { size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'}; margin: 20mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; }
            .print-container { 
              position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
              width: 100%; min-height: 100vh; z-index: 999999 !important; background: white;
              font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: black;
            }
            .kop-surat { width: 100%; margin-bottom: 24px; }
          }
        `}
        </style>
        {selectedTemplate?.kop_surat_base64 && <img src={selectedTemplate.kop_surat_base64} className="kop-surat" alt="Kop Surat" />}
        <div dangerouslySetInnerHTML={{ __html: generatedContent }} className="whitespace-pre-wrap" />
      </div>
    </>
  );
}
