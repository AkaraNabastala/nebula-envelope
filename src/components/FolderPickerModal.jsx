import React, { useState } from 'react';
import { Folder, Save } from 'lucide-react';

export default function FolderPickerModal({ settings, onClose, onSaved }) {
  const [folderKeluar, setFolderKeluar] = useState(
    settings?.manual_folder_selected ? settings?.folder_surat_keluar : ''
  );
  const [folderMasuk, setFolderMasuk] = useState(
    settings?.manual_folder_selected ? settings?.folder_surat_masuk : ''
  );

  const handleSave = async (e) => {
    e.preventDefault();
    const { saveSettings } = await import('../services/db');

    // Jika kosong saat disubmit (misal bypass dari required), fallback ke path dasar
    await saveSettings({
      folder_surat_keluar: folderKeluar || 'D:/data/surat/keluar',
      folder_surat_masuk: folderMasuk || 'D:/data/surat/masuk',
      manual_folder_selected: true
    });

    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-[#293645] w-full max-w-xl rounded-xl p-6 md:p-8 shadow-2xl border border-[#354353] animate-in zoom-in-95 duration-200">

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-[#212b36] text-[#3498db] flex items-center justify-center shrink-0 border border-[#354353]">
            <Folder size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Penyimpanan Lokal Mandiri</h3>
            <p className="text-sm font-medium text-[#b3b8c3] mt-0.5">Tentukan lokasi direktori penyimpan berkas Anda</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          <div className="bg-[#212b36] rounded-lg p-5 border border-[#354353] space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#8892a0] uppercase tracking-widest mb-2">
                Folder Tujuan Surat Keluar
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderKeluar}
                  onChange={(e) => setFolderKeluar(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 rounded-md border border-[#354353] bg-[#1a222b] text-white focus:border-[#3498db] focus:ring-1 focus:ring-[#3498db] transition-all text-sm font-mono outline-none"
                  placeholder="Silakan pilih folder Surat Keluar"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (window.api && window.api.pilihFolder) {
                      const folder = await window.api.pilihFolder();
                      if (folder) setFolderKeluar(folder);
                    } else {
                      alert("Fitur ini hanya tersedia di aplikasi mode Desktop (Electron).");
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-[#354353] text-sm font-bold text-white hover:bg-[#3498db] transition-colors shrink-0 outline-none"
                >
                  Jelajahi...
                </button>
              </div>
              <p className="text-[11px] font-medium text-[#8892a0] mt-2">Surat yang berhasil dibuat otomatis tersimpan di direktori ini.</p>
            </div>

            <div className="h-px bg-[#354353] w-full"></div>

            <div>
              <label className="block text-xs font-bold text-[#8892a0] uppercase tracking-widest mb-2">
                Folder Tujuan Arsip Surat Masuk
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderMasuk}
                  onChange={(e) => setFolderMasuk(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 rounded-md border border-[#354353] bg-[#1a222b] text-white focus:border-[#3498db] focus:ring-1 focus:ring-[#3498db] transition-all text-sm font-mono outline-none"
                  placeholder="Silakan pilih folder Arsip Surat"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (window.api && window.api.pilihFolder) {
                      const folder = await window.api.pilihFolder();
                      if (folder) setFolderMasuk(folder);
                    } else {
                      alert("Fitur ini hanya tersedia di aplikasi mode Desktop (Electron).");
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-[#354353] text-sm font-bold text-white hover:bg-[#3498db] transition-colors shrink-0 outline-none"
                >
                  Jelajahi...
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-md bg-[#212b36] border border-[#354353] text-[#b3b8c3] font-bold hover:bg-[#354353] hover:text-white transition-colors outline-none"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-md bg-[#3498db] text-white font-bold hover:bg-[#2980b9] transition-colors flex items-center gap-2 outline-none"
            >
              <Save size={18} />
              Simpan Direktori
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
