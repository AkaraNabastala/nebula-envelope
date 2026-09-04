import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, AlertTriangle, CheckCircle2, Shield, Loader2, ArrowLeft, Info } from 'lucide-react';
import { API_BASE_URL } from '../services/db';
import { toast } from 'sonner';
import defaultLogo from '../assets/icon.png';


export default function Verify({ settings }) {
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      handleVerifyQRToken(token);
    }
  }, []);

  const handleVerifyQRToken = async (token) => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/verify/qr?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success) { setResult(data); } else { setError(data.message || 'Gagal memverifikasi dokumen.'); }
    } catch (err) {
      setError('Koneksi ke server gagal.');
    } finally { setLoading(false); }
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return toast.error('Masukkan nomor registrasi terlebih dahulu.');
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/verify/tag/${encodeURIComponent(tagInput.trim())}`);
      const data = await res.json();
      if (data.success) { setResult(data); } else { setError(data.message || 'Sistem tidak menemukan dokumen ini di pangkalan data.'); }
    } catch (err) {
      setError('Koneksi ke server gagal.');
    } finally { setLoading(false); }
  };

  const logoUrl = settings?.logo_base64 || defaultLogo;

  const instansiName = settings?.nama_instansi || 'Sistem Surat';

  const renderInternalResult = () => {
    if (!result?.data) return null;
    const { nomor_surat, perihal, created_at } = result.data;
    const dateStr = new Date(created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
      <div className="mt-8 bg-emerald-50 border-t-4 border-emerald-600 p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <ShieldCheck className="w-40 h-40 text-emerald-900" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-full"><CheckCircle2 className="w-6 h-6 text-emerald-700" /></div>
            <h3 className="text-xl md:text-2xl font-bold text-emerald-800 tracking-tight">DOKUMEN VALID</h3>
          </div>
          <p className="text-emerald-700 text-sm mb-6 font-medium">Dokumen ini terdaftar secara resmi di sistem pangkalan data dan dapat dipertanggungjawabkan keasliannya.</p>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 md:p-6 border border-emerald-100 shadow-sm space-y-5">
            <div><p className="text-xs uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Nomor Registrasi Surat</p><p className="font-black text-slate-900 text-lg md:text-xl">{nomor_surat}</p></div>
            <div className="h-px w-full bg-emerald-100"></div>
            <div><p className="text-xs uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Perihal</p><p className="font-semibold text-slate-800 text-base">{perihal || '-'}</p></div>
            <div className="h-px w-full bg-emerald-100"></div>
            <div><p className="text-xs uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Waktu Penerbitan</p><p className="font-semibold text-slate-800">{dateStr} WIB</p></div>
          </div>
          <div className="mt-6 flex flex-col gap-1.5 bg-emerald-800/5 p-4 rounded-xl border border-emerald-800/10">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> SHA-256 Digital Fingerprint</span>
            <span className="text-xs md:text-sm font-mono font-medium text-emerald-700 break-all">{result.signatureHash || 'Otentikasi Internal Sistem'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col w-full h-full absolute inset-0 z-50 overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-900 rounded-b-[3rem] shadow-xl z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      <header className="relative z-10 w-full max-w-5xl mx-auto pt-10 pb-6 px-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-3 rounded-2xl shadow-lg mb-6 ring-4 ring-white/20">
          <img src={logoUrl} alt="Logo Instansi" className="h-20 w-20 object-contain" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white drop-shadow-md mb-2">Nebula Document Verification</h1>
        <p className="text-blue-100 font-medium text-lg bg-blue-950/30 px-6 py-2 rounded-full backdrop-blur-sm border border-blue-400/20">{instansiName}</p>
      </header>

      <main className="relative z-10 flex-grow w-full max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 p-6 md:p-10 mb-8">

          {!result && !loading && !error && (
            <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-blue-100">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Cek Keaslian Surat</h2>
              <p className="text-slate-500 text-sm font-medium px-4 md:px-12 leading-relaxed">
                Silakan masukkan <span className="text-blue-600 font-bold">Nomor Registrasi</span> atau <span className="text-blue-600 font-bold">Tag ID</span> yang tertera pada dokumen Anda untuk memverifikasi keasliannya di pangkalan data kami.
              </p>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <ShieldCheck className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
              </div>
              <p className="text-slate-600 font-bold text-lg animate-pulse tracking-wide">Memverifikasi dokumen...</p>
            </div>
          ) : (
            <>
              {!result && !error && (
                <form onSubmit={handleManualVerify} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Contoh: DOC-A1B2C3D4"
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 focus:bg-white font-mono font-bold text-lg md:text-xl text-center uppercase tracking-widest transition-all placeholder-slate-300 shadow-inner"
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3">
                    <ShieldCheck className="w-6 h-6" /> VERIFIKASI SEKARANG
                  </button>
                </form>
              )}

              {error && (
                <div className="bg-rose-50 border-t-4 border-rose-600 p-6 md:p-8 rounded-2xl shadow-sm animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-rose-100 p-3 rounded-full text-rose-600"><AlertTriangle className="w-8 h-8" /></div>
                    <h3 className="text-xl md:text-2xl font-bold text-rose-800 tracking-tight">DOKUMEN TIDAK DITEMUKAN</h3>
                  </div>
                  <p className="text-rose-700 font-medium mb-8 bg-white/50 p-4 rounded-xl border border-rose-100/50">{error}</p>
                  <button onClick={() => { setError(null); setTagInput(''); }} className="w-full flex items-center justify-center gap-2 text-rose-700 bg-rose-100 hover:bg-rose-200 px-6 py-4 rounded-xl font-bold transition-colors shadow-sm">
                    <ArrowLeft className="w-5 h-5" /> Coba Pencarian Lain
                  </button>
                </div>
              )}

              {result && (
                <div>
                  {renderInternalResult()}
                  <div className="mt-8 text-center">
                    <button onClick={() => { setResult(null); setTagInput(''); }} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-full font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm">
                      <Search className="w-4 h-4" /> Verifikasi Dokumen Lainnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur border border-white p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0"><Info className="w-5 h-5" /></div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            <strong>Peringatan Keamanan:</strong> Portal ini adalah sarana verifikasi resmi. Pastikan data yang tampil pada layar sesuai dengan fisik dokumen yang Anda miliki. Pemalsuan dokumen adalah tindakan kriminal yang dapat dikenakan sanksi pidana.
          </p>
        </div>
      </main>

      <footer className="relative z-10 text-slate-500 py-8 text-center text-xs mt-auto shrink-0 border-t border-slate-200/60 bg-slate-50/50">
        <p className="mb-3 font-medium">&copy; {new Date().getFullYear()} Hak Cipta Dilindungi Undang-Undang.</p>
        <div className="flex items-center justify-center gap-6">
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px]"><Shield className="w-3.5 h-3.5 text-blue-500" /> Secured Platform</span>
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px]"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Digital Fingerprint</span>
        </div>
      </footer>
    </div>
  );
}
