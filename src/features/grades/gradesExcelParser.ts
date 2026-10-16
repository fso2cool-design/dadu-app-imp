import { AssessmentItem, Enrollment } from '../../types';

export interface GradesExcelImportIssue {
  type: 'HEADER_ERROR' | 'STUDENT_SKIPPED' | 'SCORE_INVALID' | 'UNMAPPED_COLUMN' | 'AMBIGUOUS_HEADER';
  rowNumber?: number; // 1-indexed Excel row number
  columnName?: string;
  message: string;
}

export interface GradesExcelParseResult {
  success: boolean;
  fatalError: string | null;
  scoresToApply: Record<string, number>;
  totalAppliedScores: number;
  totalProcessedStudents: number;
  totalSkippedStudents: number;
  totalInvalidScores: number;
  unmappedColumns: string[];
  issues: GradesExcelImportIssue[];
}

/**
 * Normalizes header labels for comparison:
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Collapses multiple spaces into a single space
 */
export function normalizeHeader(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes student full names for exact comparison:
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Collapses multiple spaces into a single space
 */
export function normalizeName(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes student identity codes (NIS/NISN):
 * - Trims whitespace
 * - Preserves leading zeros (does NOT parse as number)
 */
export function normalizeIdentifier(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Known student metadata column aliases (case-insensitive, normalized)
 */
const STUDENT_COL_ALIASES = {
  ROLL: new Set(['no', 'no.', 'no absen', 'no. absen', 'nomor', 'nomor urut', 'no urut', 'absen']),
  NIS: new Set(['nis', 'no induk', 'nomor induk', 'no. induk', 'nis siswa']),
  NISN: new Set(['nisn', 'no nisn', 'nomor induk siswa nasional', 'nisn siswa']),
  NAME: new Set(['nama siswa', 'nama lengkap', 'nama', 'full name', 'student name', 'nama peserta didik']),
  GENDER: new Set(['l/p', 'jenis kelamin', 'jk', 'gender', 'sex']),
};

/**
 * Known summary / calculated column aliases (case-insensitive, normalized)
 * CRITICAL: These must NEVER be imported as raw assessment scores.
 */
/**
 * Known official summary column aliases from DADU export (case-insensitive, normalized).
 * Restricted strictly to official exported summary headers to avoid swallowing valid assessments
 * that happen to have short/generic names (e.g. "Status", "NA", "Ketuntasan").
 */
const SUMMARY_COL_ALIASES = new Set([
  'nilai akhir',
  'predikat',
  'status ketuntasan',
]);

interface ColumnMapping {
  index: number;
  rawHeader: string;
  kind: 'STUDENT_ROLL' | 'STUDENT_NIS' | 'STUDENT_NISN' | 'STUDENT_NAME' | 'STUDENT_GENDER' | 'SUMMARY' | 'ASSESSMENT' | 'UNKNOWN';
  assessmentItem?: AssessmentItem;
}

/**
 * Pure parser and validator for Grades Excel spreadsheet data.
 * Adheres to:
 * 1. Header-based deterministic assessment column mapping (no fixed positional offsets).
 * 2. Deterministic, collision-resistant student identification (exact NIS, NISN, or unique exact Name).
 * 3. Strict 0–100 score validation (rejects invalid text/alphanumeric prefixes).
 * 4. Explicit rejection of summary columns and unmapped/ambiguous headers.
 */
export function parseGradesExcel(
  rawRows: any[][],
  enrollments: Enrollment[],
  assessmentItems: AssessmentItem[]
): GradesExcelParseResult {
  const issues: GradesExcelImportIssue[] = [];
  const scoresToApply: Record<string, number> = {};

  if (!rawRows || rawRows.length < 2) {
    return {
      success: false,
      fatalError: 'Format file Excel kosong atau tidak sesuai (kurang dari 2 baris).',
      scoresToApply: {},
      totalAppliedScores: 0,
      totalProcessedStudents: 0,
      totalSkippedStudents: 0,
      totalInvalidScores: 0,
      unmappedColumns: [],
      issues: [{ type: 'HEADER_ERROR', message: 'File Excel kosong atau kurang dari 2 baris.' }],
    };
  }

  // 1. Locate the header row (search within first 15 rows)
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    const normalizedCells = row.map(c => normalizeHeader(String(c || '')));
    const hasStudentIdentity = normalizedCells.some(
      c => STUDENT_COL_ALIASES.NAME.has(c) || STUDENT_COL_ALIASES.NIS.has(c) || STUDENT_COL_ALIASES.NISN.has(c)
    );

    const nonEmptyCount = row.filter(c => c !== undefined && c !== null && String(c).trim() !== '').length;

    if (hasStudentIdentity && nonEmptyCount >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      success: false,
      fatalError: 'Baris header tabel nilai tidak ditemukan dalam file Excel.',
      scoresToApply: {},
      totalAppliedScores: 0,
      totalProcessedStudents: 0,
      totalSkippedStudents: 0,
      totalInvalidScores: 0,
      unmappedColumns: [],
      issues: [{ type: 'HEADER_ERROR', message: 'Baris header tabel nilai (memuat NIS/Nama) tidak ditemukan.' }],
    };
  }

  const rawHeaderRow = rawRows[headerRowIndex] || [];

  // 2. Build index of assessmentItems to detect internal duplicate names/full-headers
  const fullHeaderToItems = new Map<string, AssessmentItem[]>();
  const nameToItems = new Map<string, AssessmentItem[]>();

  assessmentItems.forEach(item => {
    const fullHeader = normalizeHeader(`${item.name} (${item.category} - ${item.weight}%)`);
    const nameHeader = normalizeHeader(item.name);

    const fullList = fullHeaderToItems.get(fullHeader) || [];
    fullList.push(item);
    fullHeaderToItems.set(fullHeader, fullList);

    const nameList = nameToItems.get(nameHeader) || [];
    nameList.push(item);
    nameToItems.set(nameHeader, nameList);
  });

  // Pre-pass: identify assessment items uniquely matched by full export headers
  // `${item.name} (${item.category} - ${item.weight}%)`
  const claimedByFullHeaderItemIds = new Set<string>();
  for (let c = 0; c < rawHeaderRow.length; c++) {
    const rawVal = rawHeaderRow[c];
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;
    const norm = normalizeHeader(String(rawVal).trim());
    const fullMatches = fullHeaderToItems.get(norm);
    if (fullMatches && fullMatches.length === 1) {
      claimedByFullHeaderItemIds.add(fullMatches[0].id);
    }
  }

  // 3. Classify all columns from the header row
  const columnMappings: ColumnMapping[] = [];
  const mappedAssessmentItemIds = new Map<string, number>(); // itemId -> colIndex
  const ambiguousHeaders: string[] = [];
  const unmappedColumns: string[] = [];

  let nisColIndex = -1;
  let nisnColIndex = -1;
  let nameColIndex = -1;
  let rollColIndex = -1;

  for (let c = 0; c < rawHeaderRow.length; c++) {
    const rawVal = rawHeaderRow[c];
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      continue;
    }

    const rawHeader = String(rawVal).trim();
    const norm = normalizeHeader(rawHeader);

    if (STUDENT_COL_ALIASES.NIS.has(norm)) {
      if (nisColIndex !== -1) {
        const prevCol = nisColIndex + 1;
        ambiguousHeaders.push(`Ditemukan lebih dari satu kolom 'NIS' (kolom ke-${prevCol} dan ke-${c + 1})`);
        issues.push({
          type: 'AMBIGUOUS_HEADER',
          columnName: rawHeader,
          message: `Ditemukan kolom 'NIS' ganda pada kolom ke-${c + 1}.`,
        });
      } else {
        nisColIndex = c;
      }
      columnMappings.push({ index: c, rawHeader, kind: 'STUDENT_NIS' });
      continue;
    }

    if (STUDENT_COL_ALIASES.NISN.has(norm)) {
      if (nisnColIndex !== -1) {
        const prevCol = nisnColIndex + 1;
        ambiguousHeaders.push(`Ditemukan lebih dari satu kolom 'NISN' (kolom ke-${prevCol} dan ke-${c + 1})`);
        issues.push({
          type: 'AMBIGUOUS_HEADER',
          columnName: rawHeader,
          message: `Ditemukan kolom 'NISN' ganda pada kolom ke-${c + 1}.`,
        });
      } else {
        nisnColIndex = c;
      }
      columnMappings.push({ index: c, rawHeader, kind: 'STUDENT_NISN' });
      continue;
    }

    if (STUDENT_COL_ALIASES.NAME.has(norm)) {
      if (nameColIndex !== -1) {
        const prevCol = nameColIndex + 1;
        ambiguousHeaders.push(`Ditemukan lebih dari satu kolom 'Nama Siswa' (kolom ke-${prevCol} dan ke-${c + 1})`);
        issues.push({
          type: 'AMBIGUOUS_HEADER',
          columnName: rawHeader,
          message: `Ditemukan kolom 'Nama Siswa' ganda pada kolom ke-${c + 1}.`,
        });
      } else {
        nameColIndex = c;
      }
      columnMappings.push({ index: c, rawHeader, kind: 'STUDENT_NAME' });
      continue;
    }

    if (STUDENT_COL_ALIASES.ROLL.has(norm)) {
      if (rollColIndex === -1) rollColIndex = c;
      columnMappings.push({ index: c, rawHeader, kind: 'STUDENT_ROLL' });
      continue;
    }

    if (STUDENT_COL_ALIASES.GENDER.has(norm)) {
      columnMappings.push({ index: c, rawHeader, kind: 'STUDENT_GENDER' });
      continue;
    }

    // Check summary columns (must never be parsed as raw assessments)
    if (SUMMARY_COL_ALIASES.has(norm)) {
      const activeItemsWithName = nameToItems.get(norm) || [];
      const isAllClaimed =
        activeItemsWithName.length > 0 &&
        activeItemsWithName.every(item => claimedByFullHeaderItemIds.has(item.id));

      if (activeItemsWithName.length > 0 && !isAllClaimed) {
        const sampleItem = activeItemsWithName[0];
        const sampleFullHeader = `${sampleItem.name} (${sampleItem.category} - ${sampleItem.weight}%)`;
        const conflictMsg = `Header '${rawHeader}' bertentangan dengan label ringkasan resmi DADU sekaligus cocok dengan nama asesmen aktif. Gunakan format header ekspor lengkap DADU (contoh: '${sampleFullHeader}') untuk mengidentifikasi asesmen secara pasti.`;
        ambiguousHeaders.push(conflictMsg);
        issues.push({
          type: 'AMBIGUOUS_HEADER',
          columnName: rawHeader,
          message: conflictMsg,
        });
        continue;
      }

      columnMappings.push({ index: c, rawHeader, kind: 'SUMMARY' });
      continue;
    }

    // Attempt to map to assessment item
    // Strategy 1: Exact full export header match `${item.name} (${item.category} - ${item.weight}%)`
    const fullMatches = fullHeaderToItems.get(norm) || [];
    if (fullMatches.length === 1) {
      const item = fullMatches[0];
      if (mappedAssessmentItemIds.has(item.id)) {
        const prevCol = mappedAssessmentItemIds.get(item.id)! + 1;
        ambiguousHeaders.push(`Asesmen '${item.name}' dipetakan oleh lebih dari satu kolom (kolom ${prevCol} dan ${c + 1})`);
      } else {
        mappedAssessmentItemIds.set(item.id, c);
        columnMappings.push({ index: c, rawHeader, kind: 'ASSESSMENT', assessmentItem: item });
      }
      continue;
    } else if (fullMatches.length > 1) {
      ambiguousHeaders.push(`Header '${rawHeader}' ambigu (cocok dengan ${fullMatches.length} asesmen identik di kelas)`);
      continue;
    }

    // Strategy 2: Match by exact assessment name (allowed only if unique)
    const nameMatches = nameToItems.get(norm) || [];
    if (nameMatches.length === 1) {
      const item = nameMatches[0];
      if (mappedAssessmentItemIds.has(item.id)) {
        const prevCol = mappedAssessmentItemIds.get(item.id)! + 1;
        ambiguousHeaders.push(`Asesmen '${item.name}' dipetakan oleh lebih dari satu kolom (kolom ${prevCol} dan ${c + 1})`);
      } else {
        mappedAssessmentItemIds.set(item.id, c);
        columnMappings.push({ index: c, rawHeader, kind: 'ASSESSMENT', assessmentItem: item });
      }
      continue;
    } else if (nameMatches.length > 1) {
      ambiguousHeaders.push(`Header nama '${rawHeader}' ambigu (terdapat ${nameMatches.length} asesmen dengan nama yang sama)`);
      continue;
    }

    

    // Unmapped / unrecognized column
    columnMappings.push({ index: c, rawHeader, kind: 'UNKNOWN' });
    unmappedColumns.push(rawHeader);
    issues.push({
      type: 'UNMAPPED_COLUMN',
      columnName: rawHeader,
      message: `Kolom '${rawHeader}' (kolom ke-${c + 1}) tidak dikenali dan diabaikan.`,
    });
  }

  // 4. Header validation assertions
  if (ambiguousHeaders.length > 0) {
    const errorMsg = `Struktur kolom penilaian ambigu: ${ambiguousHeaders.join('; ')}. Import dibatalkan untuk mencegah kesalahan nilai.`;
    return {
      success: false,
      fatalError: errorMsg,
      scoresToApply: {},
      totalAppliedScores: 0,
      totalProcessedStudents: 0,
      totalSkippedStudents: 0,
      totalInvalidScores: 0,
      unmappedColumns,
      issues: [
        ...issues,
        { type: 'AMBIGUOUS_HEADER', message: errorMsg },
      ],
    };
  }

  const mappedAssessmentCols = columnMappings.filter(c => c.kind === 'ASSESSMENT');
  if (mappedAssessmentCols.length === 0) {
    const unmappedSummary = unmappedColumns.length > 0
      ? ` (Kolom di file: ${unmappedColumns.slice(0, 3).join(', ')}${unmappedColumns.length > 3 ? '...' : ''})`
      : '';
    const errorMsg = `Tidak ada kolom penilaian yang cocok dengan daftar asesmen kelas saat ini.${unmappedSummary} Pastikan header sesuai dengan daftar asesmen.`;
    return {
      success: false,
      fatalError: errorMsg,
      scoresToApply: {},
      totalAppliedScores: 0,
      totalProcessedStudents: 0,
      totalSkippedStudents: 0,
      totalInvalidScores: 0,
      unmappedColumns,
      issues: [
        ...issues,
        { type: 'HEADER_ERROR', message: errorMsg },
      ],
    };
  }

  if (nisColIndex === -1 && nisnColIndex === -1 && nameColIndex === -1) {
    const errorMsg = 'Kolom identitas siswa (NIS, NISN, atau Nama Siswa) tidak ditemukan dalam baris header.';
    return {
      success: false,
      fatalError: errorMsg,
      scoresToApply: {},
      totalAppliedScores: 0,
      totalProcessedStudents: 0,
      totalSkippedStudents: 0,
      totalInvalidScores: 0,
      unmappedColumns,
      issues: [
        ...issues,
        { type: 'HEADER_ERROR', message: errorMsg },
      ],
    };
  }

  // 5. Index enrollments for deterministic lookup
  const nisMap = new Map<string, Enrollment[]>();
  const nisnMap = new Map<string, Enrollment[]>();
  const nameMap = new Map<string, Enrollment[]>();

  enrollments.forEach(enr => {
    const nis = normalizeIdentifier(enr.student?.nis);
    if (nis) {
      const key = nis.toLowerCase();
      const list = nisMap.get(key) || [];
      list.push(enr);
      nisMap.set(key, list);
    }

    const nisn = normalizeIdentifier(enr.student?.nisn);
    if (nisn) {
      const key = nisn.toLowerCase();
      const list = nisnMap.get(key) || [];
      list.push(enr);
      nisnMap.set(key, list);
    }

    const name = normalizeName(enr.student?.fullName || '');
    if (name) {
      const list = nameMap.get(name) || [];
      list.push(enr);
      nameMap.set(name, list);
    }
  });

  // 6. Process data rows
  let totalProcessedStudents = 0;
  let totalSkippedStudents = 0;
  let totalInvalidScores = 0;
  let totalAppliedScores = 0;
  const seenStudentIds = new Set<string>();

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    // Check if row is completely empty
    const isRowEmpty = row.every(cell => cell === undefined || cell === null || String(cell).trim() === '');
    if (isRowEmpty) continue;

    const rowNumber = r + 1;

    const rawNis = nisColIndex !== -1 ? normalizeIdentifier(row[nisColIndex]) : '';
    const rawNisn = nisnColIndex !== -1 ? normalizeIdentifier(row[nisnColIndex]) : '';
    const originalName = nameColIndex !== -1 ? String(row[nameColIndex] || '').trim() : '';
    const rawName = normalizeName(originalName);

    const hasNis = Boolean(rawNis);
    const hasNisn = Boolean(rawNisn);
    const hasName = Boolean(rawName);

    if (!hasNis && !hasNisn && !hasName) {
      issues.push({
        type: 'STUDENT_SKIPPED',
        rowNumber,
        message: `Baris ${rowNumber}: Baris data tidak memiliki NIS, NISN, atau Nama Siswa.`,
      });
      totalSkippedStudents++;
      continue;
    }

    let targetStudent: Enrollment | null = null;

    // Prioritas 1: NIS exact match
    if (hasNis) {
      const matches = nisMap.get(rawNis.toLowerCase()) || [];
      if (matches.length === 0) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: NIS '${rawNis}' tidak cocok dengan siswa manapun di kelas ini.`,
        });
        totalSkippedStudents++;
        continue;
      }
      if (matches.length > 1) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: NIS '${rawNis}' ambigu (${matches.length} siswa dengan NIS yang sama).`,
        });
        totalSkippedStudents++;
        continue;
      }
      targetStudent = matches[0];
    }

    // Prioritas 2: NISN exact match
    if (hasNisn) {
      const matches = nisnMap.get(rawNisn.toLowerCase()) || [];
      if (matches.length === 0) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: NISN '${rawNisn}' tidak cocok dengan siswa manapun di kelas ini.`,
        });
        totalSkippedStudents++;
        continue;
      }
      if (matches.length > 1) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: NISN '${rawNisn}' ambigu (${matches.length} siswa dengan NISN yang sama).`,
        });
        totalSkippedStudents++;
        continue;
      }

      // If NIS was also provided, verify consistency
      if (targetStudent && targetStudent.studentId !== matches[0].studentId) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: Konflik identitas, NIS '${rawNis}' dan NISN '${rawNisn}' menunjuk ke siswa yang berbeda.`,
        });
        totalSkippedStudents++;
        continue;
      }
      targetStudent = matches[0];
    }

    // Prioritas 3: Nama lengkap exact match (hanya jika NIS dan NISN tidak ada)
    if (!hasNis && !hasNisn) {
      const matches = nameMap.get(rawName) || [];
      if (matches.length === 0) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: Nama siswa '${originalName}' tidak ditemukan di kelas ini.`,
        });
        totalSkippedStudents++;
        continue;
      }
      if (matches.length > 1) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: Nama siswa '${originalName}' ambigu (${matches.length} siswa dengan nama yang sama).`,
        });
        totalSkippedStudents++;
        continue;
      }
      targetStudent = matches[0];
    } else if (hasName && targetStudent) {
      // Consistency check: If name is also provided alongside NIS/NISN, ensure it does not point to a different known student
      const matches = nameMap.get(rawName) || [];
      if (matches.length > 0 && !matches.some(m => m.studentId === targetStudent!.studentId)) {
        issues.push({
          type: 'STUDENT_SKIPPED',
          rowNumber,
          message: `Baris ${rowNumber}: Konflik identitas, NIS/NISN menunjuk ke '${targetStudent.student?.fullName || targetStudent.studentId}', tetapi kolom nama tertulis '${originalName}'.`,
        });
        totalSkippedStudents++;
        continue;
      }
    }

    if (!targetStudent) {
      totalSkippedStudents++;
      continue;
    }

    // Duplicate student row prevention within the same file
    if (seenStudentIds.has(targetStudent.studentId)) {
      issues.push({
        type: 'STUDENT_SKIPPED',
        rowNumber,
        message: `Baris ${rowNumber}: Siswa '${targetStudent.student?.fullName || targetStudent.studentId}' muncul lebih dari satu kali dalam file (baris duplikat diabaikan).`,
      });
      totalSkippedStudents++;
      continue;
    }
    seenStudentIds.add(targetStudent.studentId);
    totalProcessedStudents++;

    // Process scores for each mapped assessment column
    for (const col of mappedAssessmentCols) {
      const cellVal = row[col.index];
      if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '') {
        // Intentionally blank cell: leave untouched
        continue;
      }

      const valStr = String(cellVal).trim();
      // Strict number format: integers or decimals with . or , decimal separator.
      // Explicitly disallows alphanumeric prefixes/suffixes like "80abc" or "abs".
      const scoreRegex = /^(\d+(?:[.,]\d+)?)$/;
      const match = valStr.match(scoreRegex);

      if (!match) {
        issues.push({
          type: 'SCORE_INVALID',
          rowNumber,
          columnName: col.rawHeader,
          message: `Baris ${rowNumber}, Kolom '${col.rawHeader}': Nilai '${valStr}' bukan angka nilai yang valid.`,
        });
        totalInvalidScores++;
        continue;
      }

      const parsedNum = parseFloat(match[1].replace(',', '.'));
      if (isNaN(parsedNum) || parsedNum < 0 || parsedNum > 100) {
        issues.push({
          type: 'SCORE_INVALID',
          rowNumber,
          columnName: col.rawHeader,
          message: `Baris ${rowNumber}, Kolom '${col.rawHeader}': Nilai '${valStr}' di luar rentang yang diizinkan (0–100).`,
        });
        totalInvalidScores++;
        continue;
      }

      scoresToApply[`${targetStudent.studentId}_${col.assessmentItem!.id}`] = parsedNum;
      totalAppliedScores++;
    }
  }

  return {
    success: true,
    fatalError: null,
    scoresToApply,
    totalAppliedScores,
    totalProcessedStudents,
    totalSkippedStudents,
    totalInvalidScores,
    unmappedColumns,
    issues,
  };
}

export interface GradesImportFeedback {
  status: 'error' | 'warning' | 'success';
  toastType: 'error' | 'warning' | 'success';
  toastMessage: string;
  saveSuccessMessage: string | null;
  shouldApplyScores: boolean;
  scoresToApply: Record<string, number>;
  summaryParts: string[];
}

/**
 * Builds user-facing feedback and state application decisions from an Excel parse result.
 * Ensures that if zero scores are applied, diagnostic information (skipped students, invalid
 * scores, foreign unmapped columns) is clearly surfaced rather than swallowed by a generic message.
 */
export function buildGradesImportFeedback(result: GradesExcelParseResult): GradesImportFeedback {
  if (!result.success) {
    let fatalMsg = result.fatalError || 'Gagal memproses file Excel.';
    if (result.unmappedColumns.length > 0 && !fatalMsg.includes('Kolom di file:')) {
      const colPreview = result.unmappedColumns.slice(0, 3).join(', ') + (result.unmappedColumns.length > 3 ? '...' : '');
      fatalMsg = `${fatalMsg} (Kolom di file: ${colPreview})`;
    }
    return {
      status: 'error',
      toastType: 'error',
      toastMessage: fatalMsg,
      saveSuccessMessage: null,
      shouldApplyScores: false,
      scoresToApply: {},
      summaryParts: [],
    };
  }

  const unmappedSummary = result.unmappedColumns.length > 0
    ? `${result.unmappedColumns.length} kolom tidak dikenal dilewati (${result.unmappedColumns.slice(0, 3).join(', ')}${result.unmappedColumns.length > 3 ? '...' : ''})`
    : '';

  const sampleIssues = result.issues.slice(0, 2).map(i => i.message);
  const remainingCount = result.issues.length - sampleIssues.length;
  const sampleDetail = sampleIssues.length > 0
    ? ` (Contoh: ${sampleIssues.join('; ')}${remainingCount > 0 ? `, +${remainingCount} lainnya` : ''})`
    : '';

  // Zero scores applied: Never apply scores, report all available diagnostics
  if (result.totalAppliedScores === 0) {
    const issueParts = [
      result.totalSkippedStudents > 0 ? `${result.totalSkippedStudents} baris siswa dilewati` : '',
      result.totalInvalidScores > 0 ? `${result.totalInvalidScores} nilai tidak valid` : '',
      unmappedSummary,
    ].filter(Boolean);

    let message: string;
    if (issueParts.length > 0) {
      message = `Tidak ada nilai yang diimpor: ${issueParts.join(', ')}.${sampleDetail}`;
    } else {
      message = 'Tidak ada nilai valid yang dapat diimpor dari file Excel.';
    }

    return {
      status: 'warning',
      toastType: 'warning',
      toastMessage: message,
      saveSuccessMessage: null,
      shouldApplyScores: false,
      scoresToApply: {},
      summaryParts: issueParts,
    };
  }

  const hasIssues = result.totalSkippedStudents > 0 || result.totalInvalidScores > 0 || result.unmappedColumns.length > 0;

  // Clean full success: No issues, all matched and applied cleanly
  if (!hasIssues) {
    const successMsg = `Import Excel berhasil! ${result.totalAppliedScores} nilai berhasil dimuat. Klik "Simpan Perubahan" untuk menyimpan ke cloud.`;
    return {
      status: 'success',
      toastType: 'success',
      toastMessage: successMsg,
      saveSuccessMessage: successMsg,
      shouldApplyScores: true,
      scoresToApply: result.scoresToApply,
      summaryParts: [`${result.totalAppliedScores} nilai dimuat`],
    };
  }

  // Partial success: Valid scores applied, but warnings surfaced
  const warningParts = [
    `${result.totalAppliedScores} nilai dimuat`,
    result.totalSkippedStudents > 0 ? `${result.totalSkippedStudents} baris siswa dilewati` : '',
    result.totalInvalidScores > 0 ? `${result.totalInvalidScores} nilai tidak valid` : '',
    unmappedSummary,
  ].filter(Boolean);

  const detailText = sampleIssues.length > 0
    ? ` Detail: ${sampleIssues.join('; ')}${remainingCount > 0 ? `, +${remainingCount} lainnya` : ''}.`
    : '';

  const warningMsg = `Import selesai sebagian (${warningParts.join(', ')}).${detailText} Klik "Simpan Perubahan" untuk menyimpan ke cloud.`;

  return {
    status: 'warning',
    toastType: 'warning',
    toastMessage: warningMsg,
    saveSuccessMessage: warningMsg,
    shouldApplyScores: true,
    scoresToApply: result.scoresToApply,
    summaryParts: warningParts,
  };
}
