import React, { useState, useEffect } from 'react';
import { saveOutgoingLetter, deleteOutgoingLetter, bulkDeleteOutgoingLetters, triggerToast } from '../services/db';
import { generateLetterNumber, parseNumberingFormat } from '../utils/numberingEngine';
import { Hash, Plus, Trash2, Eye, Search, AlertTriangle, X, CheckSquare, Trash, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function LetterNumbers({ outgoingLetters, settings, onNumberAdded, onViewDocument }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nomorSurat, setNomorSurat] = useState('');
    const [perihal, setPerihal] = useState('');
    const [tanggalPembuatan, setTanggalPembuatan] = useState(new Date().toISOString().split('T')[0]);
    const [izinkanGanda, setIzinkanGanda] = useState(false);

    // State untuk menangani komponen nomor yang bisa diedit (NO_URUT, KODE_SURAT, dll)
    const [customVars, setCustomVars] = useState({});

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', desc: '', actionLabel: '', onConfirm: null, type: 'danger' });

    // Reset selected IDs jika ada data surat yang berubah
    useEffect(() => {
        setSelectedIds([]);
    }, [outgoingLetters]);

    const getRomanMonth = (monthIndex) => {
        const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        return romanMonths[monthIndex] || 'I';
    };

    // Mengkalkulasi ulang Nomor Surat Akhir secara otomatis!
    useEffect(() => {
        // PERBAIKAN: Menggunakan format_nomor_default (Jika kosong, gunakan default ini)
        const format = settings?.format_nomor_default || '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}';

        if (format && isModalOpen) {
            // Tanggal, Bulan, Tahun selalu otomatis mengikuti input Tanggal Pembuatan
            const selectedDate = new Date(tanggalPembuatan);
            const romanMonth = getRomanMonth(selectedDate.getMonth());
            const yearStr = String(selectedDate.getFullYear());

            const autoHiddenValues = {
                BULAN_ROMAWI: romanMonth,
                BULAN: romanMonth,
                TAHUN: yearStr
            };

            // Gabungkan nilai otomatis (Bulan/Tahun) dengan nilai dari inputan (NO_URUT/KODE)
            const combinedValues = { ...autoHiddenValues, ...customVars };
            setNomorSurat(generateLetterNumber(format, combinedValues));
        }
    }, [customVars, settings, isModalOpen, tanggalPembuatan]);

    const activeItems = outgoingLetters.filter(item => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();
        return (
            (item.nomor_surat && item.nomor_surat.toLowerCase().includes(lowerQuery)) ||
            (item.perihal && item.perihal.toLowerCase().includes(lowerQuery))
        );
    });

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(activeItems.map(item => item.id));
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
            title: `Hapus ${selectedIds.length} nomor surat terpilih?`,
            desc: 'Data nomor surat ini akan dihapus dari sistem secara permanen.',
            actionLabel: 'Hapus Massal',
            onConfirm: async () => {
                window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus', subtitle: 'Sedang membersihkan data...' } }));
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    await bulkDeleteOutgoingLetters(selectedIds);

                    setSelectedIds([]);
                    if (onNumberAdded) onNumberAdded();
                    window.dispatchEvent(new CustomEvent('hide-processing'));
                    setTimeout(() => triggerToast('Berhasil!', `${selectedIds.length} nomor surat berhasil dihapus permanen`), 300);
                } catch (error) {
                    console.error(error);
                    window.dispatchEvent(new CustomEvent('hide-processing'));
                    setTimeout(() => toast.error('Gagal menghapus beberapa data'), 300);
                }
            }
        });
    };

    const handleDelete = (item) => {
        setConfirmConfig({
            isOpen: true,
            type: 'danger',
            title: `Hapus permanen nomor ${item.nomor_surat}?`,
            desc: 'Data nomor surat ini akan dihapus secara permanen (tidak dapat dibatalkan).',
            actionLabel: 'Hapus',
            onConfirm: async () => {
                window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'delete', title: 'Menghapus', subtitle: 'Sedang membersihkan data...' } }));
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    await deleteOutgoingLetter(item.id);

                    if (window.api && window.api.hapusSuratFisik && item.file_path) {
                        await window.api.hapusSuratFisik(item.file_path);
                    }

                    setSelectedIds(prev => prev.filter(id => id !== item.id));
                    if (onNumberAdded) onNumberAdded();
                    window.dispatchEvent(new CustomEvent('hide-processing'));
                    setTimeout(() => triggerToast('Berhasil!', 'Nomor Surat berhasil dihapus'), 300);
                } catch (error) {
                    console.error(error);
                    window.dispatchEvent(new CustomEvent('hide-processing'));
                    setTimeout(() => toast.error('Gagal menghapus data'), 300);
                }
            }
        });
    };

    const resetForm = () => {
        setPerihal('');
        setTanggalPembuatan(new Date().toISOString().split('T')[0]);
        setIzinkanGanda(false);
        setCustomVars({});
    };

    const handleOpenModalBaru = () => {
        resetForm();
        const counter = settings?.counter_surat_keluar || 0;

        // PERBAIKAN: Menggunakan format_nomor_default
        const format = settings?.format_nomor_default || '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}';

        if (format) {
            const paddedNo = String(counter + 1).padStart(3, '0');
            const vars = parseNumberingFormat(format);
            const autoHidden = ['BULAN_ROMAWI', 'BULAN', 'TAHUN'];
            const initialCustom = {};

            vars.forEach(v => {
                if (!autoHidden.includes(v)) {
                    if (v === 'NO_URUT' || v === 'NO') {
                        initialCustom[v] = paddedNo; // Jadikan NO_URUT default sebagai input editable
                    } else {
                        initialCustom[v] = ''; // Sediakan state kosong untuk variabel unik seperti KODE_SURAT
                    }
                }
            });
            setCustomVars(initialCustom);
        } else {
            setNomorSurat('');
            setCustomVars({});
        }
        setIsModalOpen(true);
    };

    const checkDuplicateAndSave = () => {
        const isDuplicate = outgoingLetters.some(item => item.nomor_surat && item.nomor_surat.toLowerCase() === nomorSurat.trim().toLowerCase());

        if (isDuplicate && !izinkanGanda) {
            setConfirmConfig({
                isOpen: true,
                type: 'warning',
                title: 'Nomor Surat Ganda Terdeteksi!',
                desc: `Nomor surat "${nomorSurat}" sudah ada di sistem. Apakah Anda yakin ingin melanjutkan dan membuat nomor ganda?`,
                actionLabel: 'Tetap Simpan',
                onConfirm: () => {
                    executeSave();
                }
            });
        } else {
            executeSave();
        }
    };

    const executeSave = async () => {
        window.dispatchEvent(new CustomEvent('show-processing', { detail: { type: 'upload', title: 'Menyimpan Nomor', subtitle: 'Mendaftarkan nomor ke sistem...' } }));
        try {
            const data = {
                nomor_surat: nomorSurat.trim(),
                perihal: perihal.trim() || 'Reservasi Manual',
                nama_template: 'Manual',
                status: 'Reserved',
                created_at: new Date(tanggalPembuatan).toISOString(),
                is_docx: false,
                file_path: '',
                nama_file: '',
                folder_tersimpan: '',
                formData: {}
            };

            await saveOutgoingLetter(data);

            await new Promise(r => setTimeout(r, 800));

            if (onNumberAdded) onNumberAdded();
            setIsModalOpen(false);

            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => triggerToast('Berhasil!', 'Nomor surat berhasil didaftarkan'), 300);
        } catch (error) {
            console.error(error);
            window.dispatchEvent(new CustomEvent('hide-processing'));
            setTimeout(() => toast.error('Terjadi kesalahan saat menyimpan data.'), 300);
        }
    };

    const handleSimpanNomor = (e) => {
        e.preventDefault();
        if (!nomorSurat.trim()) {
            toast.error('Nomor Surat tidak boleh kosong');
            return;
        }

        // Verifikasi semua komponen kustom (termasuk NO_URUT) sudah terisi jika ada format
        const format = settings?.format_nomor_default || '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}';
        if (format) {
            const missingVars = Object.keys(customVars).filter(k => !customVars[k].trim());
            if (missingVars.length > 0) {
                toast.error(`Mohon lengkapi komponen: ${missingVars.map(v => v.replace(/_/g, ' ')).join(', ')}`);
                return;
            }
        }

        checkDuplicateAndSave();
    };

    const formatTanggal = (isoString) => {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString;

            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const day = String(d.getDate()).padStart(2, '0');
            const month = months[d.getMonth()];
            const year = d.getFullYear();

            return `${day} ${month} ${year}`;
        } catch (e) {
            return isoString;
        }
    };
    const handleExportExcel = () => {
        if (activeItems.length === 0) {
            toast.error("Tidak ada data untuk diexport!");
            return;
        }

        const dataToExport = activeItems.map((item, index) => {
            return {
                "No": index + 1,
                "Nomor Surat": item.nomor_surat || '-',
                "Perihal / Keterangan": item.perihal || '-',
                "Tanggal Pembuatan": formatTanggal(item.created_at)
            };
        });

        // Membuat format sheet
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Mengatur lebar kolom (Kolom Tipe sudah dihapus, sisa 4 kolom)
        const wscols = [
            { wch: 5 },  // No
            { wch: 35 }, // Nomor Surat
            { wch: 60 }, // Perihal / Keterangan (Dibuat lebih lebar)
            { wch: 25 }, // Tanggal
        ];
        ws['!cols'] = wscols;

        // Menyimpan file
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Arsip Penomoran");
        XLSX.writeFile(wb, `Arsip_Nomor_Surat_${new Date().toISOString().split('T')[0]}.xlsx`);

        toast.success("Berhasil export ke Excel!");
    };


    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <Hash size={22} strokeWidth={2.5} />
                        </div>
                        Arsip Penomoran Surat
                    </h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">
                        Manajemen Nomor Surat dan Reservasi Manual
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 group"
                    >
                        <Download size={18} className="transition-transform group-hover:-translate-y-1" />
                        Export Excel
                    </button>
                    <button
                        onClick={handleOpenModalBaru}
                        className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2 group"
                    >
                        <Plus size={18} className="transition-transform group-hover:rotate-90" />
                        Tambah Nomor Surat
                    </button>
                </div>

            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative group w-full sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Cari nomor atau perihal..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium placeholder:font-normal"
                            />
                        </div>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            <span className="text-sm font-bold text-slate-500 bg-slate-200/50 px-3 py-1 rounded-lg">
                                {selectedIds.length} Dipilih
                            </span>
                            <button
                                onClick={handleDeleteSelected}
                                className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                            >
                                <Trash size={16} />
                                Hapus Terpilih
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-sm">
                                <th className="py-4 px-6 w-12 text-center">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                            checked={selectedIds.length === activeItems.length && activeItems.length > 0}
                                            onChange={(e) => toggleSelectAll(e)}
                                        />
                                    </div>
                                </th>
                                <th className="py-4 px-4 w-12">No</th>
                                <th className="py-4 px-4">Nomor Surat</th>
                                <th className="py-4 px-4 w-32">Tipe</th>
                                <th className="py-4 px-4">Perihal</th>
                                <th className="py-4 px-4">Tanggal Pembuatan</th>
                                <th className="py-4 px-4 text-center w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {activeItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                                                <Hash size={32} className="text-slate-300" />
                                            </div>
                                            <p className="font-bold text-slate-500">Belum ada data nomor surat.</p>
                                            <p className="text-xs mt-1">Gunakan tombol "Tambah Nomor Surat" untuk membuat baru.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activeItems.map((item, idx) => {
                                    const isChecked = selectedIds.includes(item.id);
                                    const isReservedOnly = item.status === 'Reserved' || item.status === 'Manual' || !item.file_path;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-blue-50/50 transition-colors group ${isChecked ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <td className="py-4 px-6 text-center border-l-2 border-transparent group-hover:border-blue-500">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                        checked={isChecked}
                                                        onChange={() => toggleSelectOne(item.id)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-slate-400">
                                                {String(idx + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-slate-700">{item.nomor_surat || '-'}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {isReservedOnly ? (
                                                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-100 inline-block px-2 py-1 rounded-md">
                                                        Manual
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-100 inline-block px-2 py-1 rounded-md">
                                                        Sistem
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-slate-600 line-clamp-2">{item.perihal || '-'}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-slate-500 whitespace-nowrap">
                                                    {formatTanggal(item.created_at)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isReservedOnly && (
                                                        <button
                                                            onClick={() => onViewDocument(item)}
                                                            className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white flex items-center justify-center transition-colors"
                                                            title="Lihat Dokumen"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-500 text-rose-600 hover:text-white flex items-center justify-center transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <Hash size={18} className="text-blue-500" />
                                    Tambah Nomor Surat
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Form Reservasi Nomor</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-xl bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSimpanNomor} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                            <div className="space-y-4">
                                {Object.keys(customVars).length > 0 && (
                                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
                                        <p className="text-xs font-bold text-blue-600 mb-1">
                                            Lengkapi komponen nomor berikut:
                                        </p>
                                        <div className="flex flex-col gap-4">
                                            {Object.keys(customVars).map(varName => (
                                                <div key={varName} className="flex-1 w-full">
                                                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                                        <span>{varName.replace(/_/g, ' ')} <span className="text-rose-500">*</span></span>
                                                        {(varName === 'NO_URUT' || varName === 'NO') && (
                                                            <span className="text-[10px] text-blue-500 lowercase bg-blue-100 px-2 py-0.5 rounded-md">Bisa diubah manual</span>
                                                        )}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-slate-700 uppercase"
                                                        placeholder={`Masukkan ${varName.replace(/_/g, ' ')}...`}
                                                        value={customVars[varName]}
                                                        onChange={(e) => setCustomVars({ ...customVars, [varName]: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Nomor Surat Akhir <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        readOnly={true} // Selalu readonly karena akan digenerate otomatis
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-100 text-slate-700 cursor-not-allowed text-center shadow-inner"
                                        placeholder="Memproses..."
                                        value={nomorSurat}
                                        onChange={() => { }}
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center justify-center gap-1">
                                        <CheckSquare size={12} className="text-blue-500" /> Nomor ini akan disimpan secara otomatis
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Tanggal Pembuatan
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        value={tanggalPembuatan}
                                        onChange={(e) => setTanggalPembuatan(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Perihal / Keterangan
                                    </label>
                                    <textarea
                                        rows="3"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
                                        placeholder="Contoh: Undangan Rapat Orang Tua Wali..."
                                        value={perihal}
                                        onChange={(e) => setPerihal(e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={izinkanGanda}
                                                onChange={(e) => setIzinkanGanda(e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                                                <CheckSquare size={14} className="text-white opacity-0 peer-checked:opacity-100" />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Izinkan Nomor Ganda</span>
                                            <p className="text-xs font-medium text-slate-500 mt-0.5">Sistem tidak akan memunculkan peringatan jika nomor surat sudah ada sebelumnya.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </form>

                        <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSimpanNomor}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                            >
                                Simpan Nomor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmConfig.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}></div>
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className={`h-2 w-full ${confirmConfig.type === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-500'}`}>
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{confirmConfig.title}</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                {confirmConfig.desc}
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmConfig({ ...confirmConfig, isOpen: false });
                                    if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                                }}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${confirmConfig.type === 'danger'
                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                    }`}
                            >
                                {confirmConfig.actionLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
