import React, { useState, useRef } from 'react';
import { saveIncomingArchive, deleteIncomingArchive, deleteOutgoingLetter, updateOutgoingStatus, triggerReload, triggerToast, API_BASE_URL } from '../services/db';
import { Archive, Plus, Upload, FileText, Folder, Eye, Search, Filter, CheckSquare, Trash, Trash2, Edit2, Download, Send, Printer, AlertTriangle, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ArchiveLetters({ incomingArchives, outgoingLetters, settings, onArchiveAdded, onViewDocument, onOpenFolderPicker }) {
  const [activeSubTab, setActiveSubTab] = useState('keluar');
  const [printHtmlContent, setPrintHtmlContent] = useState(null); // 'masuk' atau 'keluar'
  
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
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', desc: '', actionLabel: '', onConfirm: null, type: 'danger' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeItems = (activeSubTab === 'masuk' ? incomingArchives : outgoingLetters)
    .filter(item => {
      if (activeSubTab === 'keluar' && (item.status === 'Reserved' || item.status === 'Manual' || !item.file_path)) {
        return false;
      }
      
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        (item.nomor_surat && item.nomor_surat.toLowerCase().includes(lowerQuery)) ||
        (item.pengirim && item.pengirim.toLowerCase().includes(lowerQuery)) ||
        (item.penerima && item.penerima.toLowerCase().includes(lowerQuery)) ||
        (item.perihal && item.perihal.toLowerCase().includes(lowerQuery))
      );
    });

  React.useEffect(() => {
    setSelectedIds([]);
  }, [activeSubTab]);

  const toggleSelectAll = (e, items) => {
    if (e.target.checked) {
      setSelectedIds(items.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: `Hapus ${selectedIds.length} arsip terpilih?`,
      desc: 'Dokumen digital di sistem maupun file fisik di komputer Anda akan terhapus secara permanen (tidak dapat dibatalkan).',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Arsip', subtitle: 'Sedang membersihkan file dari sistem...' } }));
        try {
          await new Promise(r => setTimeout(r, 1200)); // Simulasi delay agar animasi terlihat
          for (const id of selectedIds) {
            const item = activeItems.find(i => i.id === id);
            if (item) {
              if (activeSubTab === 'masuk') await deleteIncomingArchive(id);
              else await deleteOutgoingLetter(id);
              
              if (window.api && window.api.hapusSuratFisik && item.file_path) {
                await window.api.hapusSuratFisik(item.file_path);
              }
            }
          }
          setSelectedIds([]);
          if (onArchiveAdded) onArchiveAdded();
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => triggerToast('Berhasil!', `${selectedIds.length} surat berhasil dihapus permanen`), 300);
        } catch (error) {
          console.error(error);
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => toast.error('Gagal menghapus beberapa surat'), 300);
        }
      }
    });
  };
  
  const fileInputRef = useRef(null);

  const formatTanggal = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      return `${day} ${month} ${year} - ${hours}:${minutes}`;
    } catch (e) {
      return isoString;
    }
  };

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

  const handleDelete = (item, tipe) => {
    setConfirmConfig({
      isOpen: true,
      type: 'danger',
      title: `Hapus permanen surat ${item.nomor_surat}?`,
      desc: 'Dokumen digital di sistem maupun file fisik di komputer Anda akan terhapus secara permanen (tidak dapat dibatalkan).',
      actionLabel: 'Hapus',
      onConfirm: async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus Arsip', subtitle: 'Sedang membersihkan file dari sistem...' } }));
        try {
          await new Promise(r => setTimeout(r, 1200)); // Simulasi delay agar animasi terlihat
          if (tipe === 'masuk') {
            await deleteIncomingArchive(item.id);
          } else {
            await deleteOutgoingLetter(item.id);
          }
          
          if (window.api && window.api.hapusSuratFisik && item.file_path) {
            await window.api.hapusSuratFisik(item.file_path);
          }
          setSelectedIds(prev => prev.filter(id => id !== item.id));
          if (onArchiveAdded) onArchiveAdded();
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => triggerToast('Berhasil!', 'Arsip berhasil dihapus'), 300);
        } catch (error) {
          console.error(error);
          window.dispatchEvent(new CustomEvent('hide-processing'));
          setTimeout(() => toast.error('Gagal menghapus surat'), 300);
        }
      }
    });
  };

  const handleEditKeluar = (item) => {
    toast.info("Gunakan menu Buat Surat Baru", {
      description: "Surat Keluar ini sudah diregistrasi & dicetak. Untuk mengubah isinya, Anda disarankan membuat surat baru dengan nomor revisi."
    });
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
    window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'upload', title: 'Menyimpan Arsip', subtitle: 'Sedang memproses dokumen masuk...' } }));

    try {
      const folderTarget = settings?.folder_surat_masuk || 'D:/data/surat/masuk';

      if (fileBase64 && window.api && window.api.saveFile) {
        const saveRes = await window.api.saveFile({
          folderPath: folderTarget,
          fileName: fileName,
          fileData: fileBase64,
          isBase64: true
        });
        if (!saveRes.success) {
          window.dispatchEvent(new CustomEvent('hide-processing'));
          toast.error("Gagal menyimpan file fisik", { description: saveRes.error });
          return;
        }
      }

      const archiveData = {
        ...(isEditMode && { id: editingId }),
        nomor_surat: nomorSurat,
        pengirim: pengirim,
        perihal: perihal,
        tanggal_diterima: tanggalDiterima,
        file_name: fileName || 'Tidak ada lampiran fisik',
        folder_tersimpan: folderTarget,
        file_path: fileName ? `${folderTarget}\\${fileName}`.replace(/\\\\/g, '\\') : ''
      };

      await saveIncomingArchive(archiveData);
      
      // Artificial delay so user can see the upload animation
      await new Promise(r => setTimeout(r, 1500));
      
      if (onArchiveAdded) onArchiveAdded();
      setIsModalOpen(false);
      resetForm();
      
      window.dispatchEvent(new CustomEvent('hide-processing'));
      setTimeout(() => {
        triggerToast('Sukses!', isEditMode ? 'Arsip masuk berhasil diperbarui!' : 'Arsip masuk berhasil disimpan!');
      }, 300);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('hide-processing'));
      toast.error('Gagal', { description: 'Terjadi kesalahan saat menyimpan arsip.' });
    }
  };

  const handleConvertPdf = (item) => {
    if (!item.file_path) {
      return toast.error('File tidak ditemukan', { description: 'Tidak dapat menemukan path file dokumen asli.'});
    }
    
    setConfirmConfig({
      isOpen: true,
      type: 'info',
      title: 'Konversi ke PDF (Otomatis)',
      desc: `Sistem akan menggunakan ConvertAPI atau iLovePDF secara otomatis. Kuota gratis mungkin terpakai. Apakah Anda yakin ingin mengonversi file ${item.nomor_surat} sekarang?`,
      actionLabel: 'Konversi',
      onConfirm: async () => {
        // Menggunakan Production Token yang diberikan user sebelumnya
        const secretKey = "LkAHyYTrm2Ef800RLFyoYYlqlmnRF6Uj";

        const loadingToast = toast.loading('Mengunduh & mengonversi dokumen...', { description: 'Menghubungkan ke ConvertAPI...' });
        try {
          // 1. Dapatkan file aslinya dari server lokal
          const localFileRes = await fetch(`${API_BASE_URL}/download?path=${encodeURIComponent(item.file_path)}`);
          if (!localFileRes.ok) throw new Error("Gagal membaca dokumen asli dari penyimpanan.");
          const fileBlob = await localFileRes.blob();

          // 2. Siapkan request FormData untuk ConvertAPI
          const formData = new FormData();
          formData.append('File', fileBlob, item.file_name || 'surat.docx');
          formData.append('StoreFile', 'true');

          // 3. Tembak langsung ke server ConvertAPI
          const convertRes = await fetch('https://v2.convertapi.com/convert/docx/to/pdf', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secretKey}`
            },
            body: formData
          });

          if (!convertRes.ok) {
            const errData = await convertRes.json();
            throw new Error(errData.Message || 'Konversi ditolak oleh server ConvertAPI.');
          }

          const result = await convertRes.json();
          if (result.Files && result.Files.length > 0) {
            const pdfUrl = result.Files[0].Url;
            
            // 4. Unduh hasil PDF-nya
            const pdfRes = await fetch(pdfUrl);
            const pdfBlob = await pdfRes.blob();
            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob);
            reader.onloadend = async () => {
              const base64data = reader.result.split(',')[1];
              let baseName = item.nomor_surat ? item.nomor_surat.replace(/\//g, '_') : 'Dokumen';
              if (item.file_name && item.file_name.includes('.docx')) {
                 baseName = item.file_name.replace('.docx', '');
              }
              const finalFileName = `${baseName}.pdf`;

              if (window.api && window.api.saveFile) {
                await window.api.saveFile({
                  folderPath: item.folder_tersimpan,
                  fileName: finalFileName,
                  fileData: base64data,
                  isBase64: true
                });
                
                // Update DB record
                const endpoint = activeSubTab === 'masuk' ? `/api/incoming/${item.id}/file` : `/api/outgoing/${item.id}/file`;
                await fetch(`${API_BASE_URL}${endpoint}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    file_name: finalFileName,
                    file_path: `${item.folder_tersimpan}\\${finalFileName}`.replace(/\\\\/g, '\\')
                  })
                });

                toast.dismiss(loadingToast);
                toast.success('Berhasil Dikonversi & Disimpan!', { description: `File ${finalFileName} berhasil disimpan dan database diperbarui.` });
                
                // Panggil onArchiveAdded agar data refresh dan icon cetak bisa muncul
                if (onArchiveAdded) onArchiveAdded();
              } else {
                toast.dismiss(loadingToast);
                toast.error("Fitur simpan otomatis hanya tersedia di aplikasi Desktop.");
              }
            };
          } else {
            throw new Error("Respon ConvertAPI tidak valid.");
          }
        } catch (e) {
          // If ConvertAPI fails, try iLovePDF as fallback
          toast.loading('Beralih ke server iLovePDF...', { id: loadingToast, description: e.message || 'ConvertAPI limit habis.' });
          
          try {
            // 1. Auth iLovePDF
            const authRes = await fetch('https://api.ilovepdf.com/v1/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_key: "project_public_40ec1e05463881f6477d1f817c674fbe_dFGQ268950a1bed992ef196bf8df48a669958" })
            });
            if (!authRes.ok) throw new Error("Gagal otentikasi iLovePDF.");
            const authData = await authRes.json();
            const token = authData.token;

            // 2. Start Task
            const startRes = await fetch('https://api.ilovepdf.com/v1/start/officepdf', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!startRes.ok) throw new Error("Gagal memulai task iLovePDF.");
            const startData = await startRes.json();
            const server = startData.server;
            const taskId = startData.task;

            // 3. Upload File
            const localFileRes2 = await fetch(`${API_BASE_URL}/download?path=${encodeURIComponent(item.file_path)}`);
            const fileBlob2 = await localFileRes2.blob();
            
            const uploadForm = new FormData();
            uploadForm.append('task', taskId);
            uploadForm.append('file', fileBlob2, item.file_name || 'surat.docx');
            
            const uploadRes = await fetch(`https://${server}/v1/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: uploadForm
            });
            if (!uploadRes.ok) throw new Error("Gagal mengunggah file ke iLovePDF.");
            const uploadData = await uploadRes.json();
            const serverFilename = uploadData.server_filename;

            // 4. Process
            const processRes = await fetch(`https://${server}/v1/process`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task: taskId,
                    tool: 'officepdf',
                    files: [{ server_filename: serverFilename, filename: item.file_name || 'surat.docx' }]
                })
            });
            if (!processRes.ok) throw new Error("Gagal memproses PDF di iLovePDF.");

            // 5. Download
            const downloadRes = await fetch(`https://${server}/v1/download/${taskId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!downloadRes.ok) throw new Error("Gagal mengunduh PDF dari iLovePDF.");
            
            const pdfBlob = await downloadRes.blob();
            const reader2 = new FileReader();
            reader2.readAsDataURL(pdfBlob);
            reader2.onloadend = async () => {
              const base64data = reader2.result.split(',')[1];
              let baseName = item.nomor_surat ? item.nomor_surat.replace(/\//g, '_') : 'Dokumen';
              if (item.file_name && item.file_name.includes('.docx')) {
                 baseName = item.file_name.replace('.docx', '');
              }
              const finalFileName = `${baseName}.pdf`;

              if (window.api && window.api.saveFile) {
                await window.api.saveFile({
                  folderPath: item.folder_tersimpan,
                  fileName: finalFileName,
                  fileData: base64data,
                  isBase64: true
                });
                
                toast.dismiss(loadingToast);
                toast.success('Berhasil Dikonversi!', { description: 'Dokumen berhasil dikonversi via iLovePDF (Fallback) dan disimpan.' });
                if (onArchiveAdded) onArchiveAdded();
              } else {
                toast.dismiss(loadingToast);
                toast.error("Fitur simpan otomatis hanya tersedia di aplikasi Desktop.");
              }
            };
          } catch (e2) {
             toast.dismiss(loadingToast);
             let errorMsg = "ConvertAPI & iLovePDF gagal atau kehabisan limit.";
             if (e2.message && e2.message.includes('Failed to fetch')) errorMsg = "Gagal terhubung ke server konversi. Harap periksa koneksi internet Anda.";
             toast.error("Gagal Konversi Menyeluruh", { description: errorMsg });
          }
        }
      }
    });
  };

  const handleExportXLSX = () => {
    let data = [];
    let headers = [];
    let filename = '';

    if (activeSubTab === 'masuk') {
      headers = ['Nomor Surat', 'Pengirim', 'Perihal', 'Tanggal Diterima', 'File Lampiran', 'Lokasi Folder'];
      data = (incomingArchives||[]).map(item => ({
        'Nomor Surat': item.nomor_surat, 'Pengirim': item.pengirim, 'Perihal': item.perihal, 'Tanggal Diterima': item.tanggal_diterima, 'File Lampiran': item.file_name, 'Lokasi Folder': item.folder_tersimpan
      }));
      filename = 'Rekap_Surat_Masuk.xlsx';
    } else {
      headers = ['Nomor Surat', 'Template', 'Perihal', 'Tanggal Dibuat', 'Status', 'File Lampiran', 'Lokasi Folder'];
      data = (outgoingLetters||[]).map(item => ({
        'Nomor Surat': item.nomor_surat, 'Template': item.nama_template, 'Perihal': item.perihal || item.formData?.perihal || '-', 'Tanggal Dibuat': item.created_at, 'Status': item.status, 'File Lampiran': item.nama_file, 'Lokasi Folder': item.folder_tersimpan
      }));
      filename = 'Rekap_Surat_Keluar.xlsx';
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap");
    XLSX.writeFile(workbook, filename);
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
            {/* Action buttons moved to table toolbar */}
          </div>
        </div>

        {/* Ultra-Premium Tab Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 shrink-0">
          
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
        </div>

        {/* Table Area */}
        <div className="flex-1 bg-white/60 rounded-3xl border border-slate-200/50 flex flex-col overflow-hidden shadow-inner">
          <div className="p-4 border-b border-slate-200/50 flex flex-wrap items-center justify-between bg-white/40 gap-4">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari arsip..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all border border-rose-200"
                >
                  <Trash2 size={16} />
                  Hapus ({selectedIds.length})
                </button>
              )}
              <button
                onClick={handleExportXLSX}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Download size={16} />
                Export
              </button>
              {activeSubTab === 'masuk' && (
                <button
                  onClick={handleOpenModalBaru}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/25 transition-all"
                >
                  <Plus size={16} />
                  Arsip
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm rounded-xl">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 rounded-l-xl w-10">
                    <input type="checkbox" onChange={(e) => toggleSelectAll(e, activeItems)} checked={activeItems && activeItems.length > 0 && selectedIds.length === activeItems.length} className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
                  </th>
                  <th className="px-6 py-4">Nomor Surat</th>
                  <th className="px-6 py-4">Perihal</th>
                  <th className="px-6 py-4">Tanggal Pembuatan</th>
                  <th className="px-6 py-4">Tag Verifikasi</th>
                  <th className="px-6 py-4 text-right rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {activeSubTab === 'masuk' ? (
                  activeItems && activeItems.length > 0 ? (
                    activeItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-800">{item.nomor_surat}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700 max-w-[200px] truncate">{item.perihal}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{formatTanggal(item.tanggal_diterima)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">-</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (item.file_path && window.api && window.api.openFile) {
                                  window.api.openFile(item.file_path);
                                } else {
                                  toast.error('Gagal', { description: 'File tidak ditemukan atau fitur khusus Desktop.' });
                                }
                              }}
                              className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all"
                              title="Lihat File Asli"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (item.file_path && window.api && window.api.cetakSuratFisik) {
                                  window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'print', title: 'Mencetak Dokumen...', subtitle: 'Mengirim dokumen ke mesin printer.' } }));
                                  const res = await window.api.cetakSuratFisik(item.file_path);
                                  window.dispatchEvent(new CustomEvent('hide-processing'));
                                  if (res.success) triggerToast('Berhasil!', 'Dokumen dikirim ke Printer.');
                                  else window.dispatchEvent(new CustomEvent('show-toast', { detail: { title: 'Gagal Cetak', message: res.error, type: 'error' } }));
                                } else {
                                  toast.error('Gagal', { description: 'Fitur cetak fisik tidak tersedia.' });
                                }
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 hover:shadow-md transition-all"
                              title="Cetak Langsung (Print)"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => handleConvertPdf(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-100 hover:shadow-md transition-all font-black text-[9px]"
                              title="Convert to PDF"
                            >
                              PDF
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
                  activeItems && activeItems.length > 0 ? (
                    activeItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500 cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-800">{item.nomor_surat}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700 max-w-[200px] truncate">{item.perihal || item.formData?.perihal || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{formatTanggal(item.created_at)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {item.document_tag ? (
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100 inline-block px-2 py-1 rounded-md">{item.document_tag}</span>
                          ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 inline-block px-2 py-1 rounded-md">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (item.file_path && window.api && window.api.openFile) {
                                  window.api.openFile(item.file_path);
                                } else {
                                  toast.error('Gagal', { description: 'File tidak ditemukan atau fitur khusus Desktop.' });
                                }
                              }}
                              className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all"
                              title="Lihat File Asli"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (item.file_path) {
                                  if (item.file_path && window.api && window.api.cetakSuratFisik) {
                                    window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'print', title: 'Mencetak Dokumen...', subtitle: 'Mengirim dokumen ke mesin printer.' } }));
                                    const res = await window.api.cetakSuratFisik(item.file_path);
                                    window.dispatchEvent(new CustomEvent('hide-processing'));
                                    if (res.success) triggerToast('Berhasil!', 'Dokumen dikirim ke Printer.');
                                    else window.dispatchEvent(new CustomEvent('show-toast', { detail: { title: 'Gagal Cetak', message: res.error, type: 'error' } }));
                                  } else {
                                    toast.error('Gagal', { description: 'Fitur cetak fisik tidak tersedia.' });
                                  }
                                } else {
                                  if (item.konten) {
                                    setPrintHtmlContent(item.konten);
                                    setTimeout(() => window.print(), 100);
                                  } else {
                                    toast.error('Konten HTML tidak ditemukan.');
                                  }
                                }
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 hover:shadow-md transition-all"
                              title="Cetak Langsung (Print)"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => handleConvertPdf(item)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-100 hover:shadow-md transition-all font-black text-[9px]"
                              title="Convert to PDF"
                            >
                              PDF
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

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-red-50 text-red-500 shadow-red-500/20' : 'bg-indigo-50 text-indigo-500 shadow-indigo-500/20'} shadow-lg`}>
              {confirmConfig.type === 'danger' ? <AlertTriangle size={32} /> : <FileText size={32} />}
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
      
      {/* PRINTABLE AREA FOR HTML LETTERS */}
      {printHtmlContent && (
        <div className="hidden print:block fixed inset-0 z-[99999] bg-white print-container">
          <style>
            {`
            @media print {
              @page { size: A4; margin: 20mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; }
              .print-container { 
                position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                width: 100%; min-height: 100vh; z-index: 999999 !important; background: white;
                font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: black;
              }
            }
          `}
          </style>
          <div dangerouslySetInnerHTML={{ __html: printHtmlContent }} className="whitespace-pre-wrap" />
        </div>
      )}
    </div>
  );
}
