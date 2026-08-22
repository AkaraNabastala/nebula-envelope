import React, { useState, useEffect } from 'react';
import Login from './view/Login';
import Sidebar from './components/Sidebar';
import Titlebar from './components/Titlebar';
import Header from './components/Header';
import FolderPickerModal from './components/FolderPickerModal';
import DocumentViewerModal from './components/DocumentViewerModal';

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
    return sessionStorage.getItem('appSessionToken') === 'true' ? 'dashboard' : 'login';
  });
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('appUserRole') || 'operator');
  const [isLoading, setIsLoading] = useState(true);

  // DB Data State
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [outgoingLetters, setOutgoingLetters] = useState([]);
  const [incomingArchives, setIncomingArchives] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

  // Load and refresh state from IndexedDB
  const refreshData = async () => {
    try {
      await seedInitialData();
      const s = await getSettings();
      const t = await getTemplates();
      const m = await getMasterData();
      const out = await getOutgoingLetters();
      const inc = await getIncomingArchives();
      const logs = await getAuditLogs();

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
    refreshData();
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Memuat Sistem Surat Universal...</h2>
          <p className="text-slate-400 text-sm font-medium">Menyiapkan database dokumen & engine lokal</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'login') {
    return <Login onLoginSuccess={(role) => {
      sessionStorage.setItem('appSessionToken', 'true');
      sessionStorage.setItem('appUserRole', role || 'operator');
      setUserRole(role || 'operator');
      setActiveTab('dashboard');
    }} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('appSessionToken');
    sessionStorage.removeItem('appUserRole');
    setActiveTab('login');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans">
      <Titlebar />
      <div className="flex flex-1 bg-dot-pattern overflow-hidden">
        {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
        userRole={userRole}
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
              <MasterData masterData={masterData} onDataAdded={refreshData} />
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

      {viewingDocument && (
        <DocumentViewerModal
          documentData={viewingDocument}
          settings={settings}
          onClose={() => setViewingDocument(null)}
        />
      )}
      </div>
    </div>
  );
}