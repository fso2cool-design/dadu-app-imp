/**
 * Helper utilitas untuk sanitasi dan standarisasi tanggal dan kolom input impor Excel
 */

/**
 * Mengonversi berbagai format input tanggal menjadi format standar YYYY-MM-DD
 * Mendukung:
 * - Nomor seri Excel (contoh: 39947 -> 2009-05-14)
 * - Format ISO: YYYY-MM-DD
 * - Format Indonesia/Eropa: DD/MM/YYYY, DD-MM-YYYY, D/M/YYYY
 * - Format teks nama bulan Indonesia: "14 Mei 2009", "14-Mei-2009"
 * - Objek JavaScript Date
 */
export function sanitizeExcelDate(val: any): string {
  if (val === null || val === undefined) return '';

  // Jika berupa JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Jika berupa nomor serial Excel (bilangan numerik > 1000)
  if (typeof val === 'number' && !isNaN(val)) {
    if (val > 1000 && val < 100000) {
      // Excel epoch: 1900-01-01 (Excel leap year bug offset: 25569 = 1970-01-01)
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) {
        const yyyy = dateInfo.getUTCFullYear();
        const mm = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateInfo.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
  }

  const str = String(val).trim();
  if (!str) return '';

  // Jika string merupakan angka murni (serial excel yang terbaca string, misal "39947")
  if (/^\d{4,5}$/.test(str)) {
    const num = Number(str);
    if (num > 1000 && num < 100000) {
      return sanitizeExcelDate(num);
    }
  }

  // Format 1: YYYY-MM-DD (sudah standar ISO)
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Format 2: DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const yyyy = dmyMatch[3];
    // Jika p1 > 12, dipastikan DD/MM/YYYY
    if (p1 > 12 && p2 <= 12) {
      return `${yyyy}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Jika p2 > 12, dipastikan MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      return `${yyyy}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    // Default asumsi Indonesia DD/MM/YYYY
    const dd = String(p1).padStart(2, '0');
    const mm = String(p2).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Format 2b: 2-digit year (contoh: 11/14/10 atau 14/11/10 atau 4/10/11)
  const twoDigitYearMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (twoDigitYearMatch) {
    const p1 = parseInt(twoDigitYearMatch[1], 10);
    const p2 = parseInt(twoDigitYearMatch[2], 10);
    const yy = parseInt(twoDigitYearMatch[3], 10);
    // Asumsi tahun siswa lahir: 2000-an (2000 + yy) atau jika > 50 (1900 + yy)
    const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;

    // Jika p1 > 12 dan p2 <= 12 -> DD/MM/YY
    if (p1 > 12 && p2 <= 12) {
      return `${yyyy}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Jika p2 > 12 dan p1 <= 12 -> MM/DD/YY (seperti 11/14/10: bulan 11, tanggal 14, tahun 2010)
    if (p2 > 12 && p1 <= 12) {
      return `${yyyy}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    // Jika keduanya <= 12, periksa konteks umum Excel (sering MM/DD/YY jika US locale, atau DD/MM/YY)
    // Standar sekolah Indonesia: DD/MM/YY
    return `${yyyy}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }

  // Format 3: DD NamaBulan YYYY (Indonesia/Inggris)
  const monthNames: Record<string, string> = {
    januari: '01', jan: '01', january: '01',
    februari: '02', feb: '02', february: '02',
    maret: '03', mar: '03', march: '03',
    april: '04', apr: '04',
    mei: '05', may: '05',
    juni: '06', jun: '06', june: '06',
    juli: '07', jul: '07', july: '07',
    agustus: '08', agu: '08', ags: '08', august: '08',
    september: '09', sep: '09', sept: '09',
    oktober: '10', okt: '10', oct: '10', october: '10',
    november: '11', nov: '11',
    desember: '12', des: '12', dec: '12', december: '12',
  };

  const textDateMatch = str.match(/^(\d{1,2})[\s\-]+([a-zA-Z]+)[\s\-]+(\d{4})$/);
  if (textDateMatch) {
    const dd = textDateMatch[1].padStart(2, '0');
    const mName = textDateMatch[2].toLowerCase();
    const yyyy = textDateMatch[3];
    const mm = monthNames[mName];
    if (mm) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return str;
}

/**
 * Mencari nilai dalam sebuah objek baris Excel dengan mencoba berbagai alias nama kolom secara case-insensitive & trim.
 */
export function getRowValueByAliases(row: Record<string, any>, aliases: string[]): string {
  if (!row || typeof row !== 'object') return '';

  const cleanAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rowKeys = Object.keys(row);

  // 1. Coba pencarian persis (exact match)
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }

  // 2. Coba pencarian normalisasi (tanpa spasi & huruf kecil)
  for (const key of rowKeys) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const ca of cleanAliases) {
      if (normKey === ca && row[key] !== undefined && row[key] !== null) {
        const val = String(row[key]).trim();
        if (val) return val;
      }
    }
  }

  // 3. Coba pencarian substring jika mengandung kata kunci penting
  for (const key of rowKeys) {
    const normKey = key.toLowerCase();
    for (const alias of aliases) {
      const normAlias = alias.toLowerCase();
      if (normKey.includes(normAlias) && row[key] !== undefined && row[key] !== null) {
        const val = String(row[key]).trim();
        if (val) return val;
      }
    }
  }

  return '';
}
