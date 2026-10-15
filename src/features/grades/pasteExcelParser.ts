import { Enrollment } from '../../types';

export interface ParsedRow {
  rowIndex: number;
  studentId?: string;
  studentName?: string;
  rollNumber?: number;
  rawText: string;
  score: number | null;
  isEmpty: boolean;
  isValid: boolean;
  errorMessage?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  isValid: boolean;
  errorMessage: string | null;
  warningMessage: string | null;
  validScoreCount: number;
  emptyRowCount: number;
  excessRowCount: number;
  scoresToApply: Record<string, number>;
}

/**
 * Normalizes clipboard pasted text:
 * - Converts CRLF and CR to LF
 * - Strips at most one terminal trailing newline (standard spreadsheet copy artifact)
 * - Preserves empty lines in the middle
 */
export function normalizePastedLines(rawText: string): string[] {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (text.endsWith('\n')) {
    text = text.slice(0, -1);
  }
  return text.split('\n');
}

/**
 * Parses and strictly validates pasted scores against class enrollments.
 * Contract: Single column of numbers (0–100) aligned with student roster order.
 */
export function parsePastedScores(
  rawText: string,
  enrollments: Enrollment[]
): ParseResult {
  const lines = normalizePastedLines(rawText);

  if (lines.length === 0) {
    return {
      rows: [],
      isValid: false,
      errorMessage: null,
      warningMessage: null,
      validScoreCount: 0,
      emptyRowCount: 0,
      excessRowCount: 0,
      scoresToApply: {},
    };
  }

  const rows: ParsedRow[] = [];
  let firstErrorMessage: string | null = null;
  let validScoreCount = 0;
  let emptyRowCount = 0;
  let excessRowCount = 0;
  const scoresToApply: Record<string, number> = {};

  const totalEnrollments = enrollments.length;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    const isExcess = idx >= totalEnrollments;

    if (isExcess) {
      excessRowCount++;
    }

    const enr = !isExcess ? enrollments[idx] : undefined;
    const studentName = enr
      ? enr.student?.fullName || (enr as any).studentName || `Siswa #${enr.rollNumber || idx + 1}`
      : `(Baris ke-${idx + 1} berlebih - tanpa siswa)`;
    const studentId = enr?.studentId;
    const rollNumber = enr?.rollNumber || idx + 1;

    // Check 1: Excess row validation
    if (isExcess) {
      const rowErr = `Baris #${idx + 1} melebihi jumlah siswa di kelas (hanya ada ${totalEnrollments} siswa).`;
      if (!firstErrorMessage) firstErrorMessage = rowErr;
      rows.push({
        rowIndex: idx,
        studentId: undefined,
        studentName,
        rollNumber: undefined,
        rawText: line,
        score: null,
        isEmpty: trimmed === '',
        isValid: false,
        errorMessage: rowErr,
      });
      continue;
    }

    // Check 2: Empty line (intentional blank / unfilled)
    if (trimmed === '') {
      emptyRowCount++;
      rows.push({
        rowIndex: idx,
        studentId,
        studentName,
        rollNumber,
        rawText: line,
        score: null,
        isEmpty: true,
        isValid: true,
      });
      continue;
    }

    // Check 3: Multi-column detection (tab, semicolon)
    if (line.includes('\t') || line.includes(';')) {
      const rowErr = `Baris #${idx + 1}: Terdeteksi data multi-kolom (tab/pemisah). Harap salin hanya 1 kolom nilai.`;
      if (!firstErrorMessage) firstErrorMessage = rowErr;
      rows.push({
        rowIndex: idx,
        studentId,
        studentName,
        rollNumber,
        rawText: line,
        score: null,
        isEmpty: false,
        isValid: false,
        errorMessage: rowErr,
      });
      continue;
    }

    // Check 4: Single number format (support dot and comma as decimal separator)
    // Matches integer or single decimal: e.g. "85", "87.5", "87,5"
    const singleNumberRegex = /^\d+([.,]\d+)?$/;
    if (!singleNumberRegex.test(trimmed)) {
      let rowErr = `Baris #${idx + 1}: "${trimmed}" bukan angka nilai yang valid.`;
      if (line.includes(',') && (line.match(/,/g) || []).length > 1) {
        rowErr = `Baris #${idx + 1}: Terdeteksi beberapa nilai dalam satu baris ("${trimmed}").`;
      }
      if (!firstErrorMessage) firstErrorMessage = rowErr;
      rows.push({
        rowIndex: idx,
        studentId,
        studentName,
        rollNumber,
        rawText: line,
        score: null,
        isEmpty: false,
        isValid: false,
        errorMessage: rowErr,
      });
      continue;
    }

    // Check 5: Range validation (0 - 100)
    const normalizedNumStr = trimmed.replace(',', '.');
    const parsedNum = parseFloat(normalizedNumStr);

    if (isNaN(parsedNum) || parsedNum < 0 || parsedNum > 100) {
      const rowErr = `Baris #${idx + 1}: Nilai "${trimmed}" di luar rentang valid (harus 0–100).`;
      if (!firstErrorMessage) firstErrorMessage = rowErr;
      rows.push({
        rowIndex: idx,
        studentId,
        studentName,
        rollNumber,
        rawText: line,
        score: null,
        isEmpty: false,
        isValid: false,
        errorMessage: rowErr,
      });
      continue;
    }

    // Valid score row
    const roundedScore = Math.round(parsedNum * 10) / 10;
    validScoreCount++;
    if (studentId) {
      scoresToApply[studentId] = roundedScore;
    }

    rows.push({
      rowIndex: idx,
      studentId,
      studentName,
      rollNumber,
      rawText: line,
      score: roundedScore,
      isEmpty: false,
      isValid: true,
    });
  }

  // Determine overall status
  const hasInvalidRow = rows.some((r) => !r.isValid);
  const isOverallValid = !hasInvalidRow && excessRowCount === 0;

  let overallErrorMessage: string | null = null;
  if (!isOverallValid) {
    if (excessRowCount > 0) {
      overallErrorMessage = `Jumlah baris yang ditempel (${lines.length}) melebihi jumlah siswa di kelas (${totalEnrollments}). Harap periksa kembali data yang disalin.`;
    } else {
      overallErrorMessage = firstErrorMessage || 'Terdapat baris data yang tidak valid.';
    }
  }

  let warningMessage: string | null = null;
  if (isOverallValid && lines.length < totalEnrollments) {
    warningMessage = `Hanya ${lines.length} dari ${totalEnrollments} siswa yang memiliki baris nilai. Nilai siswa sisanya (#${lines.length + 1} s.d. #${totalEnrollments}) tidak akan diubah.`;
  }

  return {
    rows,
    isValid: isOverallValid,
    errorMessage: overallErrorMessage,
    warningMessage,
    validScoreCount,
    emptyRowCount,
    excessRowCount,
    scoresToApply: isOverallValid ? scoresToApply : {},
  };
}
