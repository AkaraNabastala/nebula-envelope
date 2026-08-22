import React, { useState, useEffect, useMemo } from 'react';
import { parseTemplateVariables, populateTemplate, formatVariableLabel, generateNativeDocx } from '../utils/templateEngine';
import { parseNumberingFormat, generateLetterNumber, getAutoNumberingValues } from '../utils/numberingEngine';
import { saveOutgoingLetter } from '../services/db';
import { Save, Calendar, Printer, FileText, CheckCircle2, ChevronRight, Zap, Eye, Settings2, Lock, FileBadge, Download } from 'lucide-react';
import QRCode from 'qrcode';

export default function CreateLetter({ templates, masterData, settings, outgoingCount, onLetterCreated }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form States
  const [variables, setVariables] = useState([]);
  const [formData, setFormData] = useState({});
  const [selectedMasterId, setSelectedMasterId] = useState('');

  // Numbering States

  const defaultFormat = settings?.format_nomor_default || '{NO_URUT}/SURAT/{BULAN_ROMAWI}/{TAHUN}';
  const numberingVars = useMemo(() => parseNumberingFormat(defaultFormat), [defaultFormat]);
  const [numberingData, setNumberingData] = useState({});
  const [isManualNumber, setIsManualNumber] = useState(false);
  const [manualNumberInput, setManualNumberInput] = useState('');

  // Save & Print Logic
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Zoom Logic
  const [zoomLevel, setZoomLevel] = useState(100);

  // Lock Logic
  const [lockedFields, setLockedFields] = useState([]);

  // Jika user mengubah isi form, status "Disimpan" dibatalkan
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

  // Paper Size Logic (Otomatis dari Template, Default A4)
  const paperSize = selectedTemplate?.ukuran_kertas === 'F4' ? 'F4' : 'A4';

  // Sync Auto Number
  useEffect(() => {
    const counter = settings?.counter_surat_keluar || 0;
    const autoVals = getAutoNumberingValues(counter + 1);
    const initialNumData = { ...autoVals };
    numberingVars.forEach(v => {
      if (initialNumData[v] === undefined) initialNumData[v] = '';
    });
    setNumberingData(initialNumData);
  }, [settings?.counter_surat_keluar, numberingVars]);

  // Handlers
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

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const folderTarget = settings?.folder_surat_keluar || 'D:/data/surat/keluar';
    const finalFormData = { ...formData, nomor_surat: generatedNumber };

    if (settings?.enable_qrcode === 1) {
       try {
          const qrData = `Surat Resmi ${settings?.nama_instansi || 'Instansi'}. Nomor: ${generatedNumber}. Perihal: ${finalFormData.perihal || '-'}`;
          const qrBase64 = await QRCode.toDataURL(qrData);
          finalFormData.qrcode = qrBase64;
       } catch (e) {
          console.error("QR Code Error:", e);
       }
    }
    
    // Generate safe file name from nomor surat and perihal
    const safeNumber = (generatedNumber || '000').replace(/[\/\\]/g, '_');
    const perihalText = finalFormData.perihal ? finalFormData.perihal.replace(/[^a-zA-Z0-9\s]/g, '').trim() : 'Surat Keluar';
    const generatedFileName = `${safeNumber}_${perihalText}`;

    let finalKonten = generatedContent;
    let fileBase64 = null;

    if (selectedTemplate?.is_docx && selectedTemplate.file_base64) {
      try {
        // Generate the physical docx file
        fileBase64 = await generateNativeDocx(selectedTemplate.file_base64, finalFormData, generatedFileName);
        finalKonten = '[File DOCX Generated]';
      } catch (error) {
        alert(error.message || "Gagal memproses file Word. Pastikan format variabelnya sesuai.");
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
      file_base64: fileBase64, // Simpan file docx hasil
      is_docx: !!selectedTemplate?.is_docx,
      folder_tersimpan: folderTarget
    };
    await saveOutgoingLetter(letterRecord);
    setIsSaved(true);
    setIsSaving(false);
    if (onLetterCreated) onLetterCreated();
  };

  const handlePrint = () => {
    if (selectedTemplate?.is_docx) {
      alert("Untuk template Word asli (.docx), file sudah otomatis diunduh saat Anda mengklik 'Simpan'. Silakan buka file tersebut di Microsoft Word untuk mencetaknya.");
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup terblokir! Izinkan popup browser untuk mencetak surat.");
      return;
    }

    const pageSizeCss = paperSize === 'F4' ? '215mm 330mm' : 'A4';

    printWindow.document.write(`
      <html>
        <head>
          <title>${generatedNumber || 'Surat'}</title>
          <style>
            @media print {
              @page { 
                size: ${pageSizeCss};
                margin: 20mm; 
              }
              body { margin: 0; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              white-space: pre-wrap;
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
              margin: 0;
            }
            .kop-surat {
              width: 100%;
              margin-bottom: 24px;
            }
          </style>
        </head>
        <body>
          ${selectedTemplate?.kop_surat_base64 ? `<img src="${selectedTemplate.kop_surat_base64}" class="kop-surat" alt="Kop Surat" />` : ''}
          ${generatedContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex flex-col font-sans pb-4 relative">
      
      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-emerald-400/5 rounded-full blur-[100px] translate-x-1/3 pointer-events-none"></div>

      {/* Workspace Area: Split Screen */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 xl:gap-6 bg-transparent relative z-10">

        {/* === KIRI: PANEL KONFIGURASI === */}
        <div className="lg:w-1/2 flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden relative group/panel">
          
          {/* Header Panel Kiri */}
          <div className="px-6 py-4 border-b border-slate-100/50 bg-white/40 shrink-0 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Studio Surat Baru</h2>
                <p className="text-[10px] font-medium text-slate-500">Konfigurasi data dokumen.</p>
              </div>
            </div>
          </div>

          {/* Form Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-6 custom-scrollbar relative">

            {/* Step 1: Template */}
            <section className="bg-white/60 border border-slate-200/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-indigo-500/20">1</div>
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Pilih Template</h3>
              </div>
              <div className="pl-8">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-transparent focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-all text-xs font-bold text-slate-700 cursor-pointer appearance-none shadow-inner outline-none"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.nama_template} ({t.kategori || 'Umum'})</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Step 2: Nomor Surat */}
            <section className="bg-white/60 border border-slate-200/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-amber-500/20">2</div>
                  <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Registrasi</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isManualNumber}
                      onChange={(e) => { setIsManualNumber(e.target.checked); resetSaveState(); }}
                      className="sr-only"
                    />
                    <div className={`block w-8 h-5 rounded-full transition-colors ${isManualNumber ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isManualNumber ? 'translate-x-3' : ''}`}></div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Manual</span>
                </label>
              </div>

              <div className="pl-8">
                {isManualNumber ? (
                  <input
                    type="text"
                    value={manualNumberInput}
                    onChange={(e) => { setManualNumberInput(e.target.value); resetSaveState(); }}
                    placeholder="Ketik nomor surat..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-transparent focus:border-amber-500 focus:bg-white bg-slate-50 shadow-inner text-xs font-bold font-mono text-slate-700 transition-all outline-none"
                  />
                ) : (
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 shadow-inner">
                    {numberingVars.filter(v => !(v === 'NO_URUT' || v === 'NO' || v === 'BULAN_ROMAWI' || v === 'BULAN' || v === 'TAHUN')).length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {numberingVars.filter(v => !(v === 'NO_URUT' || v === 'NO' || v === 'BULAN_ROMAWI' || v === 'BULAN' || v === 'TAHUN')).map(v => (
                          <div key={v}>
                            <label className="block text-[9px] font-bold uppercase tracking-widest mb-1 text-amber-600">
                              {v}
                            </label>
                            <input
                              type="text"
                              value={numberingData[v] || ''}
                              onChange={(e) => handleNumberingChange(v, e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-bold transition-all outline-none shadow-sm bg-white text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-lg text-white text-center font-mono font-bold tracking-widest shadow-lg shadow-slate-900/20 text-[11px] border border-slate-700 flex items-center justify-center gap-2">
                      <span className="text-slate-400">#</span> {generatedNumber || 'MEMPROSES...'}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Step 3: Isi Konten */}
            <section className="bg-white/60 border border-slate-200/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-emerald-500/20">3</div>
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Lengkapi Data</h3>
              </div>

              <div className="pl-8 space-y-4">
                <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-[1px] rounded-xl shadow-lg shadow-emerald-500/20">
                  <div className="bg-white/95 backdrop-blur-sm p-3 rounded-[10px] relative overflow-hidden group">
                    <label className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">
                      <Zap size={10} />
                      Magic Auto-Fill
                    </label>
                    <select
                      value={selectedMasterId}
                      onChange={handleSelectMasterEntity}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-100 focus:border-emerald-500 bg-emerald-50/50 text-[11px] font-bold text-emerald-900 cursor-pointer shadow-inner relative z-10 outline-none transition-colors"
                    >
                      <option value="">-- Pilih Master --</option>
                      {masterData.map(m => (
                        <option key={m.id} value={m.id}>{m.nama} ({m.kategori})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {variables.filter(v => v !== 'nomor_surat').length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Tidak Ada Variabel</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variables.filter(v => v !== 'nomor_surat').map(varName => {
                      const isDate = varName.toLowerCase().includes('tanggal');
                      const isLocked = lockedFields.includes(varName);

                      return (
                        <div key={varName} className="group">
                          <label className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-slate-700 capitalize tracking-wide flex items-center gap-2">
                              {formatVariableLabel(varName)}
                              {isLocked && (
                                <button
                                  type="button"
                                  onClick={() => setLockedFields(prev => prev.filter(f => f !== varName))}
                                  className="bg-emerald-100/50 hover:bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest flex items-center gap-1 border border-emerald-200/50 transition-colors cursor-pointer font-bold"
                                  title="Buka Kunci"
                                >
                                  <Lock size={8} /> Terkunci
                                </button>
                              )}
                            </span>
                          </label>
                          <div className="relative flex items-center gap-2">
                            <input
                              type="text"
                              readOnly={isLocked}
                              value={formData[varName] || ''}
                              onChange={(e) => handleInputChange(varName, e.target.value)}
                              className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold transition-all outline-none shadow-inner ${isLocked
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800 cursor-not-allowed'
                                : 'bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white text-slate-800'
                                }`}
                              placeholder={isLocked ? 'Auto' : `Ketik ${formatVariableLabel(varName)}...`}
                            />
                            {isDate && !isLocked && (
                              <button
                                type="button"
                                onClick={() => setTodayDate(varName)}
                                className="w-10 h-10 bg-indigo-50 hover:bg-indigo-500 text-indigo-600 hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
                                title="Set Hari Ini"
                              >
                                <Calendar size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {!variables.some(v => v.toLowerCase() === 'perihal') && (
                      <div className="group pt-2 border-t border-slate-100">
                        <label className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-slate-700 capitalize tracking-wide flex items-center gap-2">
                            Perihal Dokumen
                          </span>
                        </label>
                        <div className="relative flex items-center gap-2">
                          <input
                            type="text"
                            value={formData['perihal'] || ''}
                            onChange={(e) => handleInputChange('perihal', e.target.value)}
                            className="flex-1 px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold transition-all outline-none shadow-inner bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white text-slate-800"
                            placeholder="Ketik Perihal..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer Panel Kiri */}
          <div className="p-4 border-t border-slate-100/50 bg-white/40 shrink-0 z-10 relative">
            {!isSaved ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:from-indigo-500 hover:to-blue-500 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
              >
                {isSaving ? (
                  <span className="animate-pulse">Memproses...</span>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan Ke Database
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-col items-center justify-center text-emerald-700 bg-emerald-100/50 py-2 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <CheckCircle2 size={14} />
                    Berhasil!
                  </div>
                </div>
                {selectedTemplate?.is_docx ? (
                  <button
                    type="button"
                    onClick={() => { alert(`File telah disimpan langsung secara fisik ke dalam folder:\n\n${settings?.folder_surat_keluar || 'D:/data/surat/keluar'}\n\nSilakan buka File Explorer Windows Anda.`); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[11px] uppercase tracking-widest hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <CheckCircle2 size={16} />
                    Tersimpan di Folder Tujuan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-[11px] uppercase tracking-widest hover:from-black hover:to-slate-900 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <Printer size={16} />
                    Cetak Dokumen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === KANAN: PREVIEW KERTAS === */}
        <div className="lg:w-1/2 flex flex-col bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative group/preview">
          
          <div className="px-6 py-3 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20 absolute top-0 left-0 right-0">
            <h4 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 text-white">
              <Eye size={14} className="text-indigo-400" />
              Preview ({paperSize})
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                <span className="text-[9px] font-bold text-slate-400 w-6">{zoomLevel}%</span>
                <input 
                  type="range" 
                  min="30" 
                  max="120" 
                  value={zoomLevel} 
                  onChange={(e) => setZoomLevel(e.target.value)}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 pt-16 pb-8 px-4 overflow-y-auto custom-scrollbar flex justify-center relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-white/5 blur-[80px] pointer-events-none"></div>

            {selectedTemplate?.is_docx ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 relative z-10 px-8 text-center bg-slate-800/20 rounded-2xl border border-white/5">
                <FileBadge size={64} className="mb-4 text-emerald-500 opacity-80 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                <h3 className="text-sm font-black text-white mb-2 tracking-wide">PREVIEW DOKUMEN WORD ASLI</h3>
                <p className="font-sans font-medium text-xs text-slate-400 max-w-sm leading-relaxed">
                  Dokumen ini menggunakan format asli Microsoft Word (.docx). Silakan isi form di sebelah kiri.<br/><br/>
                  Klik tombol <strong className="text-emerald-400">Simpan</strong> untuk menggenerate dan mengunduh file hasil akhirnya dengan format yang 100% sempurna tanpa rusak.
                </p>
              </div>
            ) : (
              <div 
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className={`bg-white p-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] font-serif whitespace-pre-wrap text-[10pt] leading-relaxed text-black w-full transition-transform duration-200 origin-top relative z-10 flex flex-col ${paperSize === 'A4'
                  ? 'max-w-[210mm] min-h-[297mm]'
                  : 'max-w-[215.9mm] min-h-[330.2mm]'
                }`}>
                {selectedTemplate?.kop_surat_base64 && (
                  <img 
                    src={selectedTemplate.kop_surat_base64} 
                    alt="Kop Surat" 
                    className="w-full mb-6 shrink-0" 
                  />
                )}
                <div className="flex-1">
                  {generatedContent || (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 pt-20">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-300/50">Kertas Kosong</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
