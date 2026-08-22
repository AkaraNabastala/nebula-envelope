/**
  Engine Penomoran Surat Otomatis & Manual (Kompleks Dinamis)
  Mendukung pola seperti: {NO_URUT}/{KODE_KLASIFIKASI}/{KODE_INSTANSI}/{BULAN_ROMAWI}/{TAHUN}
 */

// 1. Ekstrak tag variabel dari rumus penomoran
export function parseNumberingFormat(pattern = '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}') {
  if (!pattern) return [];
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const variables = [];
  let match;
  while ((match = regex.exec(pattern)) !== null) {
    variables.push(match[1]);
  }
  return variables;
}

// 2. Buat nomor surat akhir dengan menggabungkan tag yang sudah terisi
export function generateLetterNumber(pattern = '{NO_URUT}/{BULAN_ROMAWI}/{TAHUN}', values = {}) {
  let result = pattern;
  
  Object.keys(values).forEach(key => {
    const value = values[key];
    result = result.replace(`{${key}}`, value || '');
  });
  
  return result;
}

// 3. Helper: Dapatkan nilai default otomatis untuk sistem penomoran
export function getAutoNumberingValues(sequenceNumber = 1) {
  const now = new Date();
  const year = now.getFullYear();
  const monthRoman = getRomanMonth(now.getMonth() + 1);
  const paddedNo = String(sequenceNumber).padStart(3, '0');

  return {
    NO_URUT: paddedNo,
    NO: paddedNo, // alias fallback
    BULAN_ROMAWI: monthRoman,
    BULAN: monthRoman, // alias fallback
    TAHUN: String(year)
  };
}

function getRomanMonth(month) {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanMonths[month - 1] || 'I';
}
