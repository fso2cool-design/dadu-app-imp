/**
 * Utility untuk memformat nama pejabat / guru dan penulisan gelar akademik
 * serta NIP sesuai standar Pedoman Tata Naskah Dinas (Kemenag & Kemendikbudristek)
 * dan Pedoman Umum Ejaan Bahasa Indonesia (EYD Edisi V).
 */

// Pemetaan normalisasi gelar akademik populer yang sering tertulis all-caps
const KNOWN_DEGREE_MAP: Record<string, string> = {
  'S.PD.I': 'S.Pd.I.',
  'S.PD.I.': 'S.Pd.I.',
  'S.PDI': 'S.Pd.I.',
  'S.PDI.': 'S.Pd.I.',
  'M.PD.I': 'M.Pd.I.',
  'M.PD.I.': 'M.Pd.I.',
  'M.PDI': 'M.Pd.I.',
  'M.PDI.': 'M.Pd.I.',
  'S.PD': 'S.Pd.',
  'S.PD.': 'S.Pd.',
  'M.PD': 'M.Pd.',
  'M.PD.': 'M.Pd.',
  'S.AG': 'S.Ag.',
  'S.AG.': 'S.Ag.',
  'M.AG': 'M.Ag.',
  'M.AG.': 'M.Ag.',
  'S.TH.I': 'S.Th.I.',
  'S.TH.I.': 'S.Th.I.',
  'M.TH.I': 'M.Th.I.',
  'M.TH.I.': 'M.Th.I.',
  'S.SY': 'S.Sy.',
  'S.SY.': 'S.Sy.',
  'M.SY': 'M.Sy.',
  'M.SY.': 'M.Sy.',
  'S.E.I': 'S.E.I.',
  'S.E.I.': 'S.E.I.',
  'S.SOS.I': 'S.Sos.I.',
  'S.SOS.I.': 'S.Sos.I.',
  'M.SOS.I': 'M.Sos.I.',
  'M.SOS.I.': 'M.Sos.I.',
  'S.KOM': 'S.Kom.',
  'S.KOM.': 'S.Kom.',
  'M.KOM': 'M.Kom.',
  'M.KOM.': 'M.Kom.',
  'S.SI': 'S.Si.',
  'S.SI.': 'S.Si.',
  'M.SI': 'M.Si.',
  'M.SI.': 'M.Si.',
  'S.SOS': 'S.Sos.',
  'S.SOS.': 'S.Sos.',
  'M.SOS': 'M.Sos.',
  'M.SOS.': 'M.Sos.',
  'S.HUM': 'S.Hum.',
  'S.HUM.': 'S.Hum.',
  'M.HUM': 'M.Hum.',
  'M.HUM.': 'M.Hum.',
  'S.SN': 'S.Sn.',
  'S.SN.': 'S.Sn.',
  'M.SN': 'M.Sn.',
  'M.SN.': 'M.Sn.',
  'S.PSI': 'S.Psi.',
  'S.PSI.': 'S.Psi.',
  'M.PSI': 'M.Psi.',
  'M.PSI.': 'M.Psi.',
  'S.E': 'S.E.',
  'S.E.': 'S.E.',
  'M.M': 'M.M.',
  'M.M.': 'M.M.',
  'S.H': 'S.H.',
  'S.H.': 'S.H.',
  'M.H': 'M.H.',
  'M.H.': 'M.H.',
  'S.T': 'S.T.',
  'S.T.': 'S.T.',
  'M.T': 'M.T.',
  'M.T.': 'M.T.',
  'S.TR': 'S.Tr.',
  'S.TR.': 'S.Tr.',
  'S.TR.PD': 'S.Tr.Pd.',
  'S.TR.PD.': 'S.Tr.Pd.',
  'S.TR.KOM': 'S.Tr.Kom.',
  'S.TR.KOM.': 'S.Tr.Kom.',
  'A.MD': 'A.Md.',
  'A.MD.': 'A.Md.',
  'A.MD.PD': 'A.Md.Pd.',
  'A.MD.PD.': 'A.Md.Pd.',
  'A.MD.KOM': 'A.Md.Kom.',
  'A.MD.KOM.': 'A.Md.Kom.',
  'A.MA': 'A.Ma.',
  'A.MA.': 'A.Ma.',
  'A.MA.PD': 'A.Ma.Pd.',
  'A.MA.PD.': 'A.Ma.Pd.',
  'LC': 'Lc.',
  'LC.': 'Lc.',
  'M.A': 'M.A.',
  'M.A.': 'M.A.',
  'M.P': 'M.P.',
  'M.P.': 'M.P.',
  'M.S': 'M.S.',
  'M.S.': 'M.S.',
  'PH.D': 'Ph.D.',
  'PH.D.': 'Ph.D.',
  'GR': 'Gr.',
  'GR.': 'Gr.',
};

// Gelar kehormatan / depan yang umum di Indonesia
const FRONT_TITLES_REGEX = /^(drs\.|dra\.|dr\.|prof\.|h\.|hj\.|k\.h\.|kh\.|ust\.|ir\.)\s*/i;

/**
 * Normalisasi satu komponen gelar belakang
 */
function normalizeDegreePart(part: string): string {
  const trimmed = part.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();
  if (KNOWN_DEGREE_MAP[upper]) {
    return KNOWN_DEGREE_MAP[upper];
  }

  // Jika user sudah mengetik dengan mixed case (ada huruf kecil), pertahankan aslinya
  if (/[a-z]/.test(trimmed)) {
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  // Jika ditulis kapital semua misal "S.PD.I" atau "S.KOM", ubah bagian setelah titik pertama jika ada kata
  // Regex memecah tiap segmen titik
  const segments = upper.split('.').filter(Boolean);
  if (segments.length > 1) {
    const fixedSegments = segments.map((seg, idx) => {
      if (idx === 0) return seg; // S, M, A, D
      // Jika segmen lebih dari 1 huruf, misal "PD", "KOM", "AG" -> "Pd", "Kom", "Ag"
      if (seg.length > 1 && seg !== 'ID') {
        return seg.charAt(0) + seg.slice(1).toLowerCase();
      }
      return seg;
    });
    return fixedSegments.join('.') + '.';
  }

  return trimmed;
}

/**
 * Memformat nama pejabat dan guru pada kolom tanda tangan:
 * - Nama pokok ditulis tegak kapital (UPPERCASE) sesuai standar naskah dinas
 * - Gelar kehormatan depan (Drs., Prof., Dr., H., Hj., dsb) tetap berkaidah baku
 * - Gelar akademik belakang (S.Pd.I., M.Pd., dsb) dinormalisasi huruf besar/kecilnya sesuai EYD V
 */
export function formatOfficialSignatureName(fullName?: string | null, fallback = 'Pejabat Penanda Tangan'): string {
  if (!fullName || !fullName.trim()) return fallback;

  const raw = fullName.trim();
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) return fallback;

  // Bagian 1: Nama depan & nama pokok
  let mainPart = parts[0];
  const frontTitles: string[] = [];

  // Ekstrak gelar depan jika ada (misal: "Drs. H. Zakaria")
  let match: RegExpMatchArray | null;
  while ((match = mainPart.match(FRONT_TITLES_REGEX)) !== null) {
    const rawTitle = match[1];
    // Normalisasi gelar depan
    const upperTitle = rawTitle.toUpperCase();
    let norm = rawTitle;
    if (upperTitle.startsWith('DRS.')) norm = 'Drs.';
    else if (upperTitle.startsWith('DRA.')) norm = 'Dra.';
    else if (upperTitle.startsWith('DR.')) norm = 'Dr.';
    else if (upperTitle.startsWith('PROF.')) norm = 'Prof.';
    else if (upperTitle.startsWith('HJ.')) norm = 'Hj.';
    else if (upperTitle.startsWith('H.')) norm = 'H.';
    else if (upperTitle.startsWith('K.H.') || upperTitle.startsWith('KH.')) norm = 'K.H.';
    else if (upperTitle.startsWith('UST.')) norm = 'Ust.';
    else if (upperTitle.startsWith('IR.')) norm = 'Ir.';

    frontTitles.push(norm);
    mainPart = mainPart.slice(match[0].length).trim();
  }

  // Nama pokok dikapitalisasi (UPPERCASE)
  const capitalizedName = mainPart.toUpperCase();
  const formattedFirstPart = frontTitles.length > 0 
    ? `${frontTitles.join(' ')} ${capitalizedName}`
    : capitalizedName;

  // Jika tidak ada gelar belakang
  if (parts.length === 1) {
    return formattedFirstPart;
  }

  // Normalisasi seluruh gelar belakang
  const degrees = parts.slice(1).map(normalizeDegreePart).filter(Boolean);

  return `${formattedFirstPart}, ${degrees.join(', ')}`;
}

/**
 * Memformat penulisan NIP sesuai standar BKN dan Tata Naskah Dinas Pemerintah:
 * - Tidak menggunakan titik setelah akronim NIP
 * - Standar resmi: "NIP 197808042003121008" atau "NIP -" jika tidak ada
 */
export function formatOfficialNip(rawNip?: string | null): string {
  if (!rawNip || !rawNip.trim() || rawNip.trim() === '-') {
    return 'NIP -';
  }

  // Bersihkan jika ada awalan "NIP.", "NIP:", "NIP -" dsb
  const cleaned = rawNip.trim().replace(/^NIP[\.\:\s\-]*/i, '').trim();

  if (!cleaned || cleaned === '-') {
    return 'NIP -';
  }

  return `NIP ${cleaned}`;
}
