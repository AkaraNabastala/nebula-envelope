import React, { useState, useEffect } from 'react';
import Login from './view/Login';
import Sidebar from './components/Sidebar';
import Titlebar from './components/Titlebar';
import Header from './components/Header';
import FolderPickerModal from './components/FolderPickerModal';
import { Toaster } from 'sonner';

import Dashboard from './pages/Dashboard';
import CreateLetter from './pages/CreateLetter';
import ArchiveLetters from './pages/ArchiveLetters';
import TemplateManager from './pages/TemplateManager';
import MasterData from './pages/MasterData';
import Settings from './pages/Settings';

import {
  seedInitialData,
  getSettings,
  getTemplates,
  getMasterData,
  getOutgoingLetters,
  getIncomingArchives,
  getAuditLogs
} from './services/db';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (sessionStorage.getItem('appSessionToken') === 'true') {
      return sessionStorage.getItem('activeTab') || 'dashboard';
    }
    return 'login';
  });

  useEffect(() => {
    if (activeTab !== 'login') {
      sessionStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  const [processingOverlay, setProcessingOverlay] = useState(null);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingToast');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        sessionStorage.removeItem('pendingToast');
        setTimeout(() => {
          showCustomToast(data);
        }, 1200); // Tunggu preloader selesai
      } catch (e) {}
    }

    const handleCustomToast = (e) => {
      showCustomToast(e.detail);
    };

    const handleShowProcessing = (e) => {
      setProcessingOverlay(e.detail);
    };
    const handleHideProcessing = () => {
      setProcessingOverlay(null);
    };

    window.addEventListener('show-toast', handleCustomToast);
    window.addEventListener('show-processing', handleShowProcessing);
    window.addEventListener('hide-processing', handleHideProcessing);
    
    return () => {
      window.removeEventListener('show-toast', handleCustomToast);
      window.removeEventListener('show-processing', handleShowProcessing);
      window.removeEventListener('hide-processing', handleHideProcessing);
    };
  }, []);

  const showCustomToast = (data) => {
    setSuccessToast(data);
    setIsClosingToast(false);
    setTimeout(() => {
      setIsClosingToast(true);
      setTimeout(() => {
        setSuccessToast(null);
        setIsClosingToast(false);
      }, 500); // Wait for exit animation
    }, 4500);
  };

  const handleCloseToast = () => {
    setIsClosingToast(true);
    setTimeout(() => {
      setSuccessToast(null);
      setIsClosingToast(false);
    }, 500);
  };

  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('appUserRole') || 'operator');
  const [namaLengkap, setNamaLengkap] = useState(() => sessionStorage.getItem('appNamaLengkap') || 'Pengguna');
  const [isLoading, setIsLoading] = useState(true);

  // DB Data State
  const [successToast, setSuccessToast] = useState(null);
  const [isClosingToast, setIsClosingToast] = useState(false);
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [outgoingLetters, setOutgoingLetters] = useState([]);
  const [incomingArchives, setIncomingArchives] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  // Load and refresh state from IndexedDB
  const refreshData = async () => {
    try {
      await seedInitialData();
      const [s, t, m, out, inc, logs] = await Promise.all([
        getSettings(),
        getTemplates(),
        getMasterData(),
        getOutgoingLetters(),
        getIncomingArchives(),
        getAuditLogs()
      ]);

      setSettings(s);
      setTemplates(t);
      setMasterData(m);
      setOutgoingLetters(out);
      setIncomingArchives(inc);
      setAuditLogs(logs);

      // Prompt folder picker if not manually set yet
      if (s && !s.manual_folder_selected) {
        setIsFolderPickerOpen(true);
      }
    } catch (err) {
      console.error('Error refreshing DB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.refreshAppData = refreshData;
    refreshData();

    const handleUserUpdated = (e) => {
      setNamaLengkap(e.detail.nama_lengkap);
    };
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const preloader = document.getElementById('app-preloader');
      if (preloader) {
        preloader.classList.add('preloader-hidden');
        setTimeout(() => preloader.remove(), 600);
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return null; // The SVG preloader in index.html is handling the loading state
  }

  if (activeTab === 'login') {
    return <Login settings={settings} onLoginSuccess={(role, nama_lengkap) => {
      sessionStorage.setItem('appSessionToken', 'true');
      sessionStorage.setItem('appUserRole', role || 'operator');
      sessionStorage.setItem('appNamaLengkap', nama_lengkap || 'Pengguna');
      setUserRole(role || 'operator');
      setNamaLengkap(nama_lengkap || 'Pengguna');
      setActiveTab('dashboard');
    }} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('appSessionToken');
    sessionStorage.removeItem('appUserRole');
    sessionStorage.removeItem('appNamaLengkap');
    sessionStorage.removeItem('activeTab');
    setActiveTab('login');
  };
  const isElectronApp = !!(window.electronAPI || window.api);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans">
      <Toaster position="top-right" richColors toastOptions={{ style: { marginTop: '16px', marginRight: '16px' } }} />

      {/* SLEEK ANIMATED SUCCESS TOAST - PILL DESIGN */}
      {successToast && (
        <div className={`fixed top-16 right-8 z-[99999] flex flex-col items-end justify-center ${isClosingToast ? 'toast-exit-right' : 'toast-enter-right'}`}>
          <div className="absolute inset-0 bg-emerald-400/20 blur-[30px] rounded-full w-full h-full animate-pulse pointer-events-none"></div>
          
          <div className="relative group overflow-hidden bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-full py-2 px-4 flex items-center gap-3 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.4)] transition-all">
            
            <div className="light-sweep-effect"></div>

            <div className="relative w-9 h-9 shrink-0 flex items-center justify-center z-10">
              <div className="absolute inset-0 rounded-full border-2 border-slate-700 border-t-emerald-400 border-r-emerald-400 animate-[spin_2s_linear_infinite]"></div>
              
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="absolute opacity-50 ripple-ping"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 icon-bounce"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>

            <div className="flex-1 z-10 py-1">
              <div className="text-[9px] font-black tracking-[0.2em] text-emerald-400 uppercase flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)]"></span>
                {successToast.title}
              </div>
              <p className="text-xs font-bold text-white leading-tight">{successToast.message}</p>
            </div>
          </div>
        </div>
      )}


      {isElectronApp && <Titlebar settings={settings} />}

      {/* GLOBAL PROCESSING OVERLAY */}
      {processingOverlay && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center justify-center min-w-[320px] animate-in zoom-in-95 duration-500">
            <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
              
              {processingOverlay.type === 'upload' && (
                <div className="relative flex flex-col items-center justify-center w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 z-10"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m16 16-4-4-4 4"></path></svg>
                  <div className="absolute bottom-2 w-8 h-8 bg-indigo-100 rounded-md animate-bounce opacity-80" style={{ animationDuration: '1s' }} />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              )}

              {processingOverlay.type === 'download' && (
                <div className="relative flex flex-col items-center justify-center w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 z-10"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m8 17 4 4 4-4"></path></svg>
                  <div className="absolute top-2 w-8 h-8 bg-emerald-100 rounded-md animate-bounce opacity-80" style={{ animationDuration: '1.2s' }} />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              )}

              {processingOverlay.type === 'delete' && (
                <div className="relative flex flex-col items-center justify-center w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 z-10"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  <div className="absolute -top-4 w-6 h-8 bg-slate-200 rounded-sm animate-bounce opacity-80 rotate-12" style={{ animationDuration: '0.8s' }} />
                  <div className="absolute inset-0 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin" style={{ animationDuration: '2s' }} />
                </div>
              )}

            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{processingOverlay.title || 'Memproses...'}</h3>
            <p className="text-sm font-bold text-slate-500 text-center max-w-[250px]">{processingOverlay.subtitle || 'Harap tunggu sebentar'}</p>
          </div>
        </div>
      )}
      <div className="flex flex-1 bg-dot-pattern overflow-hidden">
        {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
        userRole={userRole}
        namaLengkap={namaLengkap}
        settings={settings}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          settings={settings}
          onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 scroll-smooth">
          <div className="w-full pb-8">
            {activeTab === 'dashboard' && (
              <Dashboard
                settings={settings}
                outgoingLetters={outgoingLetters}
                incomingArchives={incomingArchives}
                masterData={masterData}
                auditLogs={auditLogs}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
                onViewDocument={(doc) => setViewingDocument(doc)}
              />
            )}

            {activeTab === 'buat-surat' && (
              <CreateLetter
                templates={templates}
                masterData={masterData}
                settings={settings}
                outgoingCount={outgoingLetters.length}
                onLetterCreated={() => refreshData()}
                onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
                onViewDocument={(doc) => setViewingDocument(doc)}
              />
            )}

            {activeTab === 'arsip' && (
              <ArchiveLetters
                incomingArchives={incomingArchives}
                outgoingLetters={outgoingLetters}
                settings={settings}
                onArchiveAdded={() => refreshData()}
                onViewDocument={(doc) => setViewingDocument(doc)}
                onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
              />
            )}

            {activeTab === 'templates' && userRole === 'admin' && (
              <TemplateManager
                templates={templates}
                onTemplatesUpdated={() => refreshData()}
              />
            )}

            {activeTab === 'master-data' && (
              <MasterData masterData={masterData} onMasterUpdated={refreshData} />
            )}

            {activeTab === 'users' && userRole === 'admin' && (
              <Settings mode="users" settings={settings} onSettingsSaved={refreshData} onOpenFolderPicker={() => setIsFolderPickerOpen(true)} />
            )}

            {activeTab === 'backup' && userRole === 'admin' && (
              <Settings mode="backup" settings={settings} onSettingsSaved={refreshData} onOpenFolderPicker={() => setIsFolderPickerOpen(true)} />
            )}

            {activeTab === 'pengaturan' && userRole === 'admin' && (
              <Settings
                settings={settings}
                onSettingsSaved={() => refreshData()}
                onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {isFolderPickerOpen && (
        <FolderPickerModal
          settings={settings}
          onClose={() => setIsFolderPickerOpen(false)}
          onSaved={() => refreshData()}
        />
      )}
      </div>
    </div>
  );
}