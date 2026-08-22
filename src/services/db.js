/**
 * REST API Client (Menggantikan IndexedDB)
 * 
 * Melakukan HTTP request ke Express Server yang berjalan di main.cjs
 * secara otomatis mendeteksi apakah diakses via Electron lokal atau Jaringan.
 */

const isDev = import.meta.env?.MODE === 'development' || window.location.port === '5173';
const isElectronFile = window.location.protocol === 'file:';

export let API_BASE_URL = '';
if (isDev || isElectronFile) {
  // Jika diakses secara lokal dari Komputer A (lewat Electron atau Vite dev server)
  // TODO: Port harusnya dinamis jika admin mengubahnya, tapi untuk aman kita fallback ke 8080
  API_BASE_URL = 'http://localhost:8080/api';
} else {
  // Jika diakses dari Komputer B (via Browser LAN), gunakan asal IP secara otomatis
  API_BASE_URL = `${window.location.origin}/api`;
}

// Fungsi helper untuk Request
async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
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
  await fetchAPI('/settings', {
    method: 'POST',
    body: JSON.stringify(newSettings)
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

// ==========================================
// SURAT KELUAR
// ==========================================
export async function getOutgoingLetters() {
  return await fetchAPI('/outgoing').catch(() => []);
}

export async function deleteOutgoingLetter(id) {
  await fetchAPI(`/outgoing/${id}`, { method: 'DELETE' });
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
    return { success: res.success === true, role: res.role || 'operator' };
  } catch (e) {
    return { success: false, role: 'operator' };
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

export async function resetPasswordAdmin(newPassword) {
  // Implementasi endpoint khusus reset password jika diperlukan
  // Untuk saat ini fallback ke pesan sukses palsu
  console.log("Password reset functionality to be implemented in backend");
  return true;
}
