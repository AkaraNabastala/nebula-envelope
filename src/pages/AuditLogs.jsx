import React from 'react';
import { IconActivity, IconClock } from '../components/Icons';

export default function AuditLogs({ logs }) {
  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <IconActivity size={28} className="text-indigo-600" />
          Log Aktivitas & Riwayat Rekam Jejak
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          Catatan riwayat pembuatan surat, pengarsipan, dan perubahan konfigurasi sistem secara real-time.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4 w-64 flex items-center gap-2">
                  <IconClock size={16} /> Waktu & Tanggal
                </th>
                <th className="px-6 py-4">Aktivitas Rekam Jejak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs && logs.length > 0 ? (
                logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">{log.waktu}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800 whitespace-normal min-w-[300px]">
                      {log.aktivitas}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <IconActivity size={32} className="mb-3 opacity-50" />
                      <p className="text-sm font-medium">Belum ada catatan log aktivitas yang terekam.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
