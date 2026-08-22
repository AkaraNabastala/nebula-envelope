import React from 'react';
import { exportToDocx, exportToPdf, exportToText, exportToImage } from '../utils/exporter';
import { Eye, Download } from 'lucide-react';

export default function DocumentViewerModal({ documentData, onClose, settings }) {
  if (!documentData) return null;

  const content = documentData.konten || documentData.perihal || 'Tidak ada pratinjau teks.';
  const title = documentData.nomor_surat || documentData.judul || 'Dokumen Surat';

  const handleExportWord = () => {
    if (documentData.is_docx && documentData.file_path) {
      window.open(`http://127.0.0.1:8080/api/download?path=${encodeURIComponent(documentData.file_path)}`, '_blank');
    } else {
      exportToDocx(title, content, `Surat_${documentData.nomor_surat || 'Dokumen'}`);
    }
  };

  const handleExportPdf = () => {
    exportToPdf(title, content, `Surat_${documentData.nomor_surat || 'Dokumen'}`);
  };

  const handleExportText = () => {
    exportToText(content, `Surat_${documentData.nomor_surat || 'Dokumen'}`, 'txt');
  };

  const handleExportPng = () => {
    exportToImage('document-preview-paper', `Surat_${documentData.nomor_surat || 'Dokumen'}`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 md:px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <Eye size={20} />
            </div>
            <div>
              <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase block mb-0.5">PRATINJAU DOKUMEN INTERNAL</span>
              <h3 className="m-0 text-base font-bold text-white leading-none">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body / Document Preview */}
        <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar flex justify-center">
          <div 
            id="document-preview-paper" 
            className="bg-white p-8 md:p-12 rounded-lg shadow-sm border border-slate-200 w-full max-w-3xl min-h-[500px] font-serif whitespace-pre-wrap text-slate-800 leading-relaxed text-sm md:text-base relative"
          >
            {documentData.is_docx && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm z-10 text-center p-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
                  <Download size={32} />
                </div>
                <h4 className="text-lg font-black text-slate-800 mb-2">DOKUMEN WORD (.DOCX)</h4>
                <p className="text-sm font-semibold text-slate-500 max-w-sm mb-6">
                  Preview dimatikan untuk mempertahankan format asli file Word. Silakan download file aslinya di bawah.
                </p>
                <button
                  onClick={handleExportWord}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Download size={18} /> Download DOCX Asli
                </button>
              </div>
            )}
            {!documentData.is_docx && content}
          </div>
        </div>

        {/* Modal Footer (Export Buttons) */}
        <div className="p-4 md:px-6 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            Lokasi Simpan: 
            <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono border border-slate-200">
              {settings?.folder_surat_keluar || 'D:/data/surat/keluar'}
            </code>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
            <button
              onClick={handleExportText}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              .TXT
            </button>
            <button
              onClick={handleExportPng}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              .PNG
            </button>
            <button
              onClick={handleExportWord}
              className="px-4 py-2 rounded-lg border border-transparent bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download size={14} /> DOCX
            </button>
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 rounded-lg border border-transparent bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download size={14} /> PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
