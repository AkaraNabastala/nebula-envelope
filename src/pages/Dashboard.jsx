import React, { useState, useEffect } from 'react';
import {
  FileEdit, Archive, Users, Folder, BarChart3, ArrowRight, Activity,
  LogIn, Send, Inbox, Trash2, Settings, FileText, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getDashboardStats } from '../services/db';

export default function Dashboard({ settings, outgoingLetters, incomingArchives, masterData, auditLogs, onNavigate, onOpenFolderPicker }) {

  const [showAllDocs, setShowAllDocs] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const data = await getDashboardStats();
      if(data) setStats(data);
    }
    loadStats();
  }, [outgoingLetters, incomingArchives, masterData]);

  // Gabungkan dan urutkan surat keluar & masuk berdasarkan tanggal
  const combinedLetters = [
    ...(outgoingLetters || []).map(l => ({ ...l, type: 'Keluar', date: new Date(l.created_at) })),
    ...(incomingArchives || []).map(l => ({ ...l, type: 'Masuk', date: new Date(l.tanggal_diterima || l.created_at) }))
  ].sort((a, b) => b.date - a.date);

  const recentLetters = combinedLetters.slice(0, 4);

  // Helper untuk merapikan format tanggal
  const formatLogTime = (waktuStr) => {
    if (!waktuStr) return { date: '', time: '' };
    try {
      const parts = waktuStr.split(',');
      if (parts.length === 2) {
        let datePart = parts[0].trim();
        let timePart = parts[1].trim();
        timePart = timePart.replace(/[:.]\d{2}$/, ''); // Hapus detik
        timePart = timePart.replace(/\./g, ':'); // Jadikan format jam:menit
        return { date: datePart, time: timePart };
      }
      return { date: waktuStr, time: '' };
    } catch (e) {
      return { date: waktuStr, time: '' };
    }
  };

  // Helper untuk memberi icon dan warna dinamis pada log
  const getLogStyle = (text) => {
    if (!text) return { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100' };
    const t = text.toLowerCase();
    if (t.includes('login')) return { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100' };
    if (t.includes('surat keluar')) return { icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-100' };
    if (t.includes('surat masuk') || t.includes('mengarsipkan')) return { icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (t.includes('hapus')) return { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-100' };
    if (t.includes('pengaturan') || t.includes('sandi')) return { icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' };
    if (t.includes('entitas') || t.includes('master')) return { icon: Users, color: 'text-amber-600', bg: 'bg-amber-100' };
    if (t.includes('template')) return { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' };
    return { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100' };
  };

  // Helper untuk format tampilan path direktori
  const getDisplayPath = () => {
    if (!settings?.folder_surat_keluar) return 'Belum diatur';
    // Jika masih default dan belum disetel admin, anggap kosong
    if ((settings.folder_surat_keluar === 'D:/data/surat/keluar' || settings.folder_surat_keluar === 'D:\\data\\surat\\keluar') && !settings.manual_folder_selected) {
      return 'Belum diatur';
    }

    const path = settings.folder_surat_keluar;
    const parts = path.split(/[/\\]/).filter(Boolean);

    if (parts.length <= 3) {
      return path;
    }

    const drive = parts[0];
    const lastTwo = parts.slice(-2).join('\\');
    return `${drive}\\...\\${lastTwo}`;
  };

  const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex-1 min-h-0 flex flex-col font-sans bg-transparent animate-in fade-in duration-500 w-full h-full overflow-hidden gap-4">

      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-indigo-400/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      {/* Main Container - FULL HEIGHT NO SCROLL */}
      <div className="flex-1 flex flex-col h-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-5 lg:p-6 relative z-10 overflow-hidden">

        {/* Header Section */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                Dashboard
              </span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Pantauan ringkas aktivitas sistem persuratan.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200/50 shadow-inner">
            <BarChart3 size={14} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-600">{currentDate}</span>
          </div>
        </div>

        {/* --- KARTU STATISTIK (MODERN DOCUMENT STYLE) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 mb-5">

          {/* Card 1 */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-4 rounded-2xl shadow-md border border-indigo-400 flex flex-col group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <FileEdit size={80} className="text-white transform translate-x-4 -translate-y-4" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-white/20 text-white rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <FileEdit size={16} />
                </div>
                <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full">
                  Surat Keluar
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-0.5 tabular-nums">{stats ? stats.total_outgoing : (outgoingLetters?.length || 0)}</h3>
              <p className="text-[10px] font-semibold text-indigo-100 mt-auto">Total Dokumen Dibuat</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 rounded-2xl shadow-md border border-emerald-400 flex flex-col group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Archive size={80} className="text-white transform translate-x-4 -translate-y-4" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-white/20 text-white rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Archive size={16} />
                </div>
                <span className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full">
                  Arsip Masuk
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-0.5 tabular-nums">{stats ? stats.total_incoming : (incomingArchives?.length || 0)}</h3>
              <p className="text-[10px] font-semibold text-emerald-100 mt-auto">Surat yang Diarsipkan</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-2xl shadow-md border border-amber-400 flex flex-col group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Users size={80} className="text-white transform translate-x-4 -translate-y-4" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-white/20 text-white rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Users size={16} />
                </div>
                <span className="text-[9px] font-bold text-amber-100 uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full">
                  Master Data
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-0.5 tabular-nums">{masterData?.length || 0}</h3>
              <p className="text-[10px] font-semibold text-amber-100 mt-auto">Total Users Tersimpan</p>
            </div>
          </div>

          {/* Card 4 (Folder) */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-4 rounded-2xl shadow-md border border-slate-600 flex flex-col group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Folder size={80} className="text-white transform translate-x-4 -translate-y-4" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Folder size={16} />
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-full">
                  Direktori
                </span>
              </div>
              <h3 className="text-xs font-bold text-white mb-1 truncate" title={settings?.folder_surat_keluar || 'Belum diatur'}>
                {getDisplayPath()}
              </h3>
              <div className="mt-auto">
                <button
                  onClick={onOpenFolderPicker}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group-hover:gap-2 transition-all w-max bg-black/20 px-2.5 py-1 rounded-lg"
                >
                  Ubah Lokasi <ArrowRight size={10} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* --- STATISTIK CHART --- */}
        {stats && stats.chartData && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 shrink-0">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-blue-600" />
              Statistik Aktivitas Persuratan {new Date().getFullYear()}
            </h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="outgoing" name="Surat Keluar" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incoming" name="Surat Masuk" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* --- GRID TABEL & LOGS --- */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Recent Letters Table (Takes 2 columns) */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Dokumen Terakhir</h3>
                </div>
              </div>
              {combinedLetters && combinedLetters.length > 4 && (
                <button
                  onClick={() => setShowAllDocs(true)}
                  className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                  Semua <ArrowRight size={12} />
                </button>
              )}
            </div>

            <div className="overflow-auto flex-1 custom-scrollbar p-2">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2.5 border-b border-slate-100">Nomor Surat</th>
                    <th className="px-4 py-2.5 border-b border-slate-100">Perihal</th>
                    <th className="px-4 py-2.5 border-b border-slate-100 text-right">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentLetters.length > 0 ? (
                    recentLetters.map((letter, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {letter.type === 'Keluar' ? <Send size={12} className="text-indigo-500" /> : <Inbox size={12} className="text-emerald-500" />}
                            <span className="font-bold text-slate-700">{letter.nomor_surat}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-600 truncate max-w-[200px] inline-block" title={letter.perihal || letter.formData?.perihal}>
                            {letter.perihal || letter.formData?.perihal || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${letter.type === 'Keluar'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                            {letter.type}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-2">
                          <Archive size={20} />
                        </div>
                        <p className="text-slate-500 font-bold text-[11px]">Belum ada dokumen tercatat.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Sidebar (Takes 1 column) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" />
                Log Aktivitas
              </h3>
              {auditLogs && auditLogs.length > 4 && (
                <button
                  onClick={() => setShowAllLogs(true)}
                  className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                  Semua <ArrowRight size={12} />
                </button>
              )}
            </div>

            <div className="p-3 flex flex-col justify-start flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.slice(0, 4).map((log, idx) => {
                    const style = getLogStyle(log.keterangan || log.aktivitas);
                    const Icon = style.icon;
                    const timeObj = formatLogTime(log.waktu);
                    return (
                      <div key={idx} className="flex items-start gap-2.5 group p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${style.bg} ${style.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0 mt-1">
                          <p className="text-[11px] font-semibold text-slate-700 leading-snug break-words pr-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                            {log.keterangan || log.aktivitas}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 mt-0.5 text-right">
                          <span className="text-[9px] font-bold text-slate-500">
                            {timeObj.time}
                          </span>
                          <span className="text-[8px] font-semibold text-slate-400">
                            {timeObj.date}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                    <Activity size={20} className="opacity-30 mb-2" />
                    <p className="text-[11px] font-bold">Belum ada log aktivitas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: SEMUA DOKUMEN */}
      {showAllDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAllDocs(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Semua Dokumen</h3>
                  <p className="text-[10px] font-semibold text-slate-500">Riwayat lengkap surat keluar dan masuk.</p>
                </div>
              </div>
              <button onClick={() => setShowAllDocs(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              <table className="w-full text-left text-xs whitespace-nowrap bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <thead className="bg-slate-50/80">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3 border-b border-slate-100">Waktu</th>
                    <th className="px-4 py-3 border-b border-slate-100">Nomor Surat</th>
                    <th className="px-4 py-3 border-b border-slate-100">Perihal</th>
                    <th className="px-4 py-3 border-b border-slate-100 text-right">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {combinedLetters.map((letter, idx) => {
                    const timeObj = formatLogTime(letter.created_at || letter.tanggal_diterima);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-500">{timeObj.date}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {letter.type === 'Keluar' ? <Send size={12} className="text-indigo-500" /> : <Inbox size={12} className="text emerald-500" />}
                            <span className="font-bold text-slate-700">{letter.nomor_surat}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-600 truncate max-w-[250px] inline-block" title={letter.perihal || letter.formData?.perihal}>
                            {letter.perihal || letter.formData?.perihal || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[9px] border font-bold uppercase tracking-wider ${letter.type === 'Keluar'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                            {letter.type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SEMUA LOG AKTIVITAS */}
      {showAllLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAllLogs(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Semua Log Aktivitas</h3>
                  <p className="text-[10px] font-semibold text-slate-500">Riwayat aktivitas sistem lengkap.</p>
                </div>
              </div>
              <button onClick={() => setShowAllLogs(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              <div className="space-y-3">
                {auditLogs.map((log, idx) => {
                  const style = getLogStyle(log.keterangan || log.aktivitas);
                  const Icon = style.icon;
                  const timeObj = formatLogTime(log.waktu);
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-10">
                        <p className="text-xs font-semibold text-slate-700 leading-snug">
                          {log.keterangan || log.aktivitas}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-center shrink-0 h-10 text-right">
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mb-0.5">
                          {timeObj.date}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                          {timeObj.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
