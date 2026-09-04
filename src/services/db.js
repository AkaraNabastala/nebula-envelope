/**
 * REST API Client (Menggantikan IndexedDB)
 * 
 * Melakukan HTTP request ke Express Server yang berjalan di main.cjs
 * secara otomatis mendeteksi apakah diakses via Electron lokal atau Jaringan.
 */

const isDev = import.meta.env?.MODE === 'development' || window.location.port === '5173';
const isElectronFile = window.location.protocol === 'file:';
import { toast } from 'sonner';

export let API_BASE_URL = '';
if (isDev || isElectronFile) {
  // Jika diakses secara lokal dari Komputer A (lewat Electron atau Vite dev server)
  // Ambil port dinamis dari parameter URL yang disematkan oleh main.cjs
  const urlParams = new URLSearchParams(window.location.search);
  const activePort = urlParams.get('port') || '8080';
  API_BASE_URL = `http://localhost:${activePort}/api`;
} else {
  // Jika diakses dari Komputer B (via Browser LAN), gunakan asal IP secara otomatis
  API_BASE_URL = `${window.location.origin}/api`;
}

export const setApiPort = (port) => {
  if (isDev || isElectronFile) {
    API_BASE_URL = `http://localhost:${port}/api`;
  }
};


// Fungsi helper untuk Request
async function fetchAPI(endpoint, options = {}) {
  try {
    const isGet = !options.method || options.method === 'GET';
    const cacheOption = isGet ? { cache: 'no-store' } : {};
    
    // Pastikan tidak ada caching di semua level
    const finalEndpoint = isGet 
      ? (endpoint.includes('?') ? `${endpoint}&_t=${Date.now()}` : `${endpoint}?_t=${Date.now()}`)
      : endpoint;

    const res = await fetch(`${API_BASE_URL}${finalEndpoint}`, {
      ...cacheOption,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Gagal fetch ${endpoint}:`, error);
    throw error;
  }
}

// ==========================================
// INISIALISASI (Tidak perlu lagi, ditangani backend)
// ==========================================
export async function seedInitialData() {
  // Server backend sudah menangani seeding otomatis saat pertama kali berjalan
  return true;
}

// ==========================================
// SETTINGS
// ==========================================
export async function getSettings() {
  return await fetchAPI('/settings').catch(() => null);
}

export async function saveSettings(newSettings) {
  const currentSettings = await getSettings() || {};
  const mergedSettings = { ...currentSettings, ...newSettings };
  await fetchAPI('/settings', {
    method: 'POST',
    body: JSON.stringify(mergedSettings)
  });
  return await getSettings();
}

// ==========================================
// MASTER DATA
// ==========================================
export async function getMasterData() {
  return await fetchAPI('/master').catch(() => []);
}

export async function addMasterItem(item) {
  const res = await fetchAPI('/master', {
    method: 'POST',
    body: JSON.stringify(item)
  });
  return res.id;
}

export async function deleteMasterItem(id) {
  await fetchAPI(`/master/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteMasterItems(ids) {
  await fetchAPI(`/master/bulk/delete`, {
    method: 'POST',
    body: JSON.stringify({ ids })
  });
}

export async function deleteAllMasterItems() {
  await fetchAPI('/master/bulk/all', { method: 'DELETE' });
}

// ==========================================
// TEMPLATES
// ==========================================
export async function getTemplates() {
  return await fetchAPI('/templates').catch(() => []);
}

export async function saveTemplate(template) {
  const res = await fetchAPI('/templates', {
    method: 'POST',
    body: JSON.stringify(template)
  });
  return res.id;
}

export async function deleteTemplate(id) {
  await fetchAPI(`/templates/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteTemplates(ids) {
  for (const id of ids) {
    await deleteTemplate(id);
  }
}

export async function injectOpsi2Template() {
  await fetchAPI('/inject-opsi2', { method: 'POST' });
}

// ==========================================
// SURAT KELUAR
// ==========================================
export async function getOutgoingLetters() {
  return await fetchAPI('/outgoing').catch(() => []);
}

export async function deleteOutgoingLetter(id) {
  await fetchAPI(`/outgoing/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteOutgoingLetters(ids) {
  await fetchAPI(`/outgoing/bulk/delete`, {
    method: 'POST',
    body: JSON.stringify({ ids })
  });
}

export async function saveOutgoingLetter(letter) {
  const res = await fetchAPI('/outgoing', {
    method: 'POST',
    body: JSON.stringify(letter)
  });
  return res.id;
}

export async function updateOutgoingStatus(id, status) {
  await fetchAPI(`/outgoing/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

// ==========================================
// SURAT MASUK (ARSIP)
// ==========================================
export async function getIncomingArchives() {
  return await fetchAPI('/incoming').catch(() => []);
}

export async function deleteIncomingArchive(id) {
  await fetchAPI(`/incoming/${id}`, { method: 'DELETE' });
}

export async function saveIncomingArchive(archive) {
  const res = await fetchAPI('/incoming', {
    method: 'POST',
    body: JSON.stringify(archive)
  });
  return res.id;
}

// ==========================================
// AUDIT LOGS
// ==========================================
export async function getAuditLogs() {
  return await fetchAPI('/logs').catch(() => []);
}

export async function addAuditLog(aktivitas) {
  // Hanya opsional jika frontend mau catat log paksa,
  // kebanyakan log kini dilakukan otomatis oleh backend SQLite.
  console.log('Log recorded on server:', aktivitas);
}

// ==========================================
// KEAMANAN (LOGIN)
// ==========================================
export async function verifikasiUserLocal(username, password) {
  try {
    const res = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return { success: res.success === true, role: res.role || 'operator', nama_lengkap: res.nama_lengkap || 'Pengguna' };
  } catch (e) {
    return { success: false, role: 'operator', nama_lengkap: 'Pengguna' };
  }
}

// ==========================================
// PENGGUNA (RBAC)
// ==========================================
export async function getUsers() {
  return await fetchAPI('/users').catch(() => []);
}

export async function saveUser(user) {
  await fetchAPI('/users', {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

export async function deleteUser(username) {
  await fetchAPI(`/users/${username}`, { method: 'DELETE' });
}

// ==========================================
// DASHBOARD STATS
// ==========================================
export async function getDashboardStats() {
  return await fetchAPI('/dashboard/stats').catch(() => null);
}

export async function resetPasswordAdmin(username, master_pin, new_password) {
  const res = await fetchAPI('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ username, master_pin, new_password })
  });
  
  if (res.error) {
    throw new Error(res.error);
  }
  return true;
}

export const triggerToast = (title, message, type = 'success') => {
  if (type === 'success') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { type, title, message } }));
  } else if (type === 'error') {
    toast.error(title, { description: message });
  } else {
    toast.info(title, { description: message });
  }
};

export const triggerReload = (delay = 2500) => {
  if (document.getElementById('reload-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'reload-overlay';
  overlay.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center transition-all duration-300 opacity-0';
  overlay.innerHTML = `
    <div class="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
      <div class="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p class="text-sm font-bold text-slate-700 animate-pulse">Memuat ulang data...</p>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    overlay.classList.add('opacity-100');
  });
  setTimeout(async () => {
    if (typeof window.refreshAppData === 'function') {
      await window.refreshAppData();
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 300);
    } else {
      window.location.reload();
    }
  }, delay);
};
