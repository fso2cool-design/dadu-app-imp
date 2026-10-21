import { describe, expect, it } from 'vitest';
import { AssessmentItem, Enrollment } from '../../types';
import { parseGradesExcel, buildGradesImportFeedback, findGradesHeaderRow, resolveGradesWorksheetData, PREFERRED_GRADES_SHEET_NAMES } from './gradesExcelParser';

describe('gradesExcelParser - Unit and Regression Tests', () => {
  const createMockEnrollments = (): Enrollment[] => [
    {
      id: 'enr_1',
      academicYearId: 'ay_2026',
      classId: 'cls_xa',
      studentId: 'std_1',
      rollNumber: 1,
      status: 'ACTIVE',
      createdAt: null,
      updatedAt: null,
      student: {
        id: 'std_1',
        nis: '202601',
        nisn: '0012345678',
        fullName: 'Ahmad Fauzi Ramadhan',
        gender: 'L',
        status: 'ACTIVE',
        createdAt: null,
        updatedAt: null,
      },
    },
    {
      id: 'enr_2',
      academicYearId: 'ay_2026',
      classId: 'cls_xa',
      studentId: 'std_2',
      rollNumber: 2,
      status: 'ACTIVE',
      createdAt: null,
      updatedAt: null,
      student: {
        id: 'std_2',
        nis: '202602',
        nisn: '0012345679',
        fullName: 'Ahmad Fauzi',
        gender: 'L',
        status: 'ACTIVE',
        createdAt: null,
        updatedAt: null,
      },
    },
    {
      id: 'enr_3',
      academicYearId: 'ay_2026',
      classId: 'cls_xa',
      studentId: 'std_3',
      rollNumber: 3,
      status: 'ACTIVE',
      createdAt: null,
      updatedAt: null,
      student: {
        id: 'std_3',
        nis: '202603',
        nisn: '0012345680',
        fullName: 'Budi Santoso',
        gender: 'L',
        status: 'ACTIVE',
        createdAt: null,
        updatedAt: null,
      },
    },
    {
      id: 'enr_4',
      academicYearId: 'ay_2026',
      classId: 'cls_xa',
      studentId: 'std_4',
      rollNumber: 4,
      status: 'ACTIVE',
      createdAt: null,
      updatedAt: null,
      student: {
        id: 'std_4',
        nis: '202604',
        nisn: '0012345681',
        fullName: 'Citra Dewi',
        gender: 'P',
        status: 'ACTIVE',
        createdAt: null,
        updatedAt: null,
      },
    },
  ];

  const createMockAssessmentItems = (): AssessmentItem[] => [
    {
      id: 'item_tugas1',
      academicYearId: 'ay_2026',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta_1',
      classId: 'cls_xa',
      subjectId: 'sbj_math',
      name: 'Tugas 1',
      category: 'ASSIGNMENT',
      assessmentDate: '2026-08-01',
      maxScore: 100,
      weight: 30,
      isIncludedInFinalScore: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 'item_uh1',
      academicYearId: 'ay_2026',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta_1',
      classId: 'cls_xa',
      subjectId: 'sbj_math',
      name: 'Ulangan Harian 1',
      category: 'QUIZ',
      assessmentDate: '2026-08-15',
      maxScore: 100,
      weight: 70,
      isIncludedInFinalScore: true,
      createdAt: null,
      updatedAt: null,
    },
  ];

  // =========================================================================
  // SKENARIO A — URUTAN KOLOM BERUBAH
  // =========================================================================
  describe('Skenario A — Urutan Kolom Asesmen Berubah', () => {
    it('memetakan nilai ke asesmen yang benar ketika posisi kolom ditukar di Excel', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Excel where column order is UH 1 first, then Tugas 1 (swapped from default export order)
      const rawRows = [
        ['DAFTAR NILAI AKADEMIK - Matematika'],
        ['Kelas: X-A'],
        [],
        ['No', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Ulangan Harian 1 (QUIZ - 70%)', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', '0012345678', 'Ahmad Fauzi Ramadhan', 'L', 65, 95],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.fatalError).toBeNull();
      expect(result.totalAppliedScores).toBe(2);

      // Verify each score mapped to the correct assessment ID, NOT swapped by offset
      expect(result.scoresToApply['std_1_item_uh1']).toBe(65);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(95);
    });

    it('memetakan nilai ketika kolom asesmen hanya menggunakan nama asesmen tanpa bobot', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Ulangan Harian 1', 'Tugas 1'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 78, 88],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_1_item_uh1']).toBe(78);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(88);
    });
  });

  // =========================================================================
  // SKENARIO B — KOLOM TAMBAHAN DAN RINGKASAN
  // =========================================================================
  describe('Skenario B — Kolom Tambahan dan Ringkasan', () => {
    it('tidak mengimpor Nilai Akhir, Predikat, atau Status Ketuntasan sebagai nilai asesmen', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Full DADU export format with summary columns at the end
      const rawRows = [
        ['DAFTAR NILAI AKADEMIK - Matematika'],
        ['Kelas: X-A | Tahun Ajaran: 2026/2027 (GANJIL)'],
        ['Metode: Rata-rata Berbobot | KKTP: 75'],
        [],
        [
          'No',
          'NIS',
          'NISN',
          'Nama Siswa',
          'L/P',
          'Tugas 1 (ASSIGNMENT - 30%)',
          'Ulangan Harian 1 (QUIZ - 70%)',
          'Nilai Akhir',
          'Predikat',
          'Status Ketuntasan',
        ],
        [1, '202601', '0012345678', 'Ahmad Fauzi Ramadhan', 'L', 80, 90, 87, 'A', 'TUNTAS'],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalAppliedScores).toBe(2);
      expect(result.unmappedColumns).toHaveLength(0); // Official summary columns are not flagged as unmapped foreign columns
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(80);
      expect(result.scoresToApply['std_1_item_uh1']).toBe(90);

      // Verify that no summary values leaked into scores
      const appliedValues = Object.values(result.scoresToApply);
      expect(appliedValues).not.toContain('A');
      expect(appliedValues).not.toContain('TUNTAS');
    });

    it('mengabaikan kolom asing yang disisipkan dan mencatatnya sebagai unmapped column', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Catatan Guru', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 'Sangat rajin', 85, 92],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.unmappedColumns).toContain('Catatan Guru');
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(85);
      expect(result.scoresToApply['std_1_item_uh1']).toBe(92);
      expect(Object.keys(result.scoresToApply)).toHaveLength(2);
    });
  });

  // =========================================================================
  // SKENARIO C — ASESMEN DENGAN NAMA AMBIGU
  // =========================================================================
  describe('Skenario C — Asesmen dengan Nama Ambigu', () => {
    it('menolak import jika terdapat dua asesmen dengan nama yang sama persis di kelas', () => {
      const enrollments = createMockEnrollments();
      const ambiguousItems: AssessmentItem[] = [
        {
          id: 'item_1',
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          teachingAssignmentId: 'ta_1',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          name: 'Tugas Harian',
          category: 'ASSIGNMENT',
          assessmentDate: '2026-08-01',
          maxScore: 100,
          weight: 20,
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: 'item_2',
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          teachingAssignmentId: 'ta_1',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          name: 'Tugas Harian',
          category: 'ASSIGNMENT',
          assessmentDate: '2026-08-10',
          maxScore: 100,
          weight: 20,
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
      ];

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas Harian'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, ambiguousItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain('ambigu');
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });

    it('menolak import jika satu asesmen dipetakan oleh dua kolom berbeda dalam satu sheet', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Tugas 1'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 80, 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain('ambigu');
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });
  });

  // =========================================================================
  // SKENARIO D — IDENTITAS SISWA DETERMINISTIK & ANTI-AMBIGUITAS
  // =========================================================================
  describe('Skenario D — Identitas Siswa', () => {
    it('mencocokkan siswa berdasarkan NIS exact match', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['NIS', 'Tugas 1 (ASSIGNMENT - 30%)'],
        ['202601', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(90);
    });

    it('mencocokkan siswa berdasarkan NISN exact match', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['NISN', 'Tugas 1 (ASSIGNMENT - 30%)'],
        ['0012345679', 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_2_item_tugas1']).toBe(85);
    });

    it('mencocokkan nama exact match yang unik ketika NIS dan NISN tidak ada', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        ['Budi Santoso', 88],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_3_item_tugas1']).toBe(88);
    });

    it('TIDAK mencocokkan nama dengan substring: Ahmad Fauzi tidak boleh mencocokkan Ahmad Fauzi Ramadhan', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Excel specifies "Ahmad Fauzi" without NIS.
      // In the old buggy code, .includes('ahmad fauzi') matched 'Ahmad Fauzi Ramadhan' first!
      const rawRows = [
        ['Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        ['Ahmad Fauzi', 75],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      // std_2 is "Ahmad Fauzi", std_1 is "Ahmad Fauzi Ramadhan"
      expect(result.scoresToApply['std_2_item_tugas1']).toBe(75);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
    });

    it('menolak nama yang menghasilkan beberapa kandidat identik (homonim) jika tanpa NIS', () => {
      const enrollments = createMockEnrollments();
      // Add a duplicate name with different NIS
      enrollments.push({
        id: 'enr_5',
        academicYearId: 'ay_2026',
        classId: 'cls_xa',
        studentId: 'std_5',
        rollNumber: 5,
        status: 'ACTIVE',
        createdAt: null,
        updatedAt: null,
        student: {
          id: 'std_5',
          nis: '202605',
          nisn: '0012345682',
          fullName: 'Budi Santoso', // Homonym with std_3
          gender: 'L',
          status: 'ACTIVE',
          createdAt: null,
          updatedAt: null,
        },
      });

      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        ['Budi Santoso', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.scoresToApply['std_3_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_5_item_tugas1']).toBeUndefined();
    });

    it('menolak baris jika NIS tidak ditemukan dan TIDAK diam-diam beralih ke nama', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // NIS '999999' does not exist, but name matches std_1
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '999999', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
    });

    it('menolak baris jika NIS dan NISN menunjuk ke siswa berbeda (konflik identitas)', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // NIS 202601 belongs to std_1, but NISN 0012345679 belongs to std_2
      const rawRows = [
        ['No', 'NIS', 'NISN', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', '0012345679', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_2_item_tugas1']).toBeUndefined();
    });

    it('menolak baris jika NIS cocok tetapi NISN yang disediakan tidak ditemukan (tidak fallback ke nama/absen)', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // NIS 202601 matches std_1, but NISN 9999999999 does not exist anywhere
      const rawRows = [
        ['No', 'NIS', 'NISN', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', '9999999999', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalProcessedStudents).toBe(0);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.totalAppliedScores).toBe(0);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
      const skipIssue = result.issues.find(i => i.type === 'STUDENT_SKIPPED' && i.message.includes("NISN '9999999999' tidak cocok"));
      expect(skipIssue).toBeDefined();
      expect(skipIssue?.rowNumber).toBe(2);
    });

    it('menolak penimpaan nilai ketika siswa yang sama muncul dua kali dalam file (baris kedua diabaikan)', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Row 1 and Row 2 both identify std_1, but have different scores (80 vs 95)
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 80],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 95],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalProcessedStudents).toBe(1);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.totalAppliedScores).toBe(1);
      // Row 1 score must be preserved; row 2 must NOT overwrite
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(80);
      expect(result.scoresToApply['std_1_item_tugas1']).not.toBe(95);
      expect(Object.keys(result.scoresToApply)).toHaveLength(1);
      const dupIssue = result.issues.find(i => i.type === 'STUDENT_SKIPPED' && i.message.includes('muncul lebih dari satu kali'));
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.rowNumber).toBe(3);
    });

    it('TIDAK menggunakan nomor absen untuk membajak siswa lain', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Row has No = 1 (roll number 1 is std_1), but name is "Citra Dewi" (std_4) and no NIS
      const rawRows = [
        ['No', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, 'Citra Dewi', 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      // Must map to std_4, NEVER std_1!
      expect(result.scoresToApply['std_4_item_tugas1']).toBe(85);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
    });
  });

  // =========================================================================
  // SKENARIO E — VALIDASI NILAI
  // =========================================================================
  describe('Skenario E — Validasi Nilai', () => {
    it('menerima nilai batas 0 dan 100 serta format desimal koma dan titik', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['NIS', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        ['202601', 0, 100],
        ['202602', '85.5', '87,5'],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalInvalidScores).toBe(0);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(0);
      expect(result.scoresToApply['std_1_item_uh1']).toBe(100);
      expect(result.scoresToApply['std_2_item_tugas1']).toBe(85.5);
      expect(result.scoresToApply['std_2_item_uh1']).toBe(87.5);
    });

    it('mengabaikan sel kosong tanpa menganggapnya error', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['NIS', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        ['202601', 90, ''],
        ['202602', '', 95],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalInvalidScores).toBe(0);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(90);
      expect(result.scoresToApply['std_1_item_uh1']).toBeUndefined();
      expect(result.scoresToApply['std_2_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_2_item_uh1']).toBe(95);
    });

    it('menolak nilai di luar rentang < 0 atau > 100', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['NIS', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        ['202601', -5, 120],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalInvalidScores).toBe(2);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_1_item_uh1']).toBeUndefined();
    });

    it('menolak teks bukan numerik dan teks dengan prefix numerik seperti 80abc', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['NIS', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        ['202601', '80abc', 'abs'],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalInvalidScores).toBe(2);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_1_item_uh1']).toBeUndefined();
    });
  });

  // =========================================================================
  // SKENARIO F — STRUKTUR HEADER DAN REGRESI ROUNDTRIP
  // =========================================================================
  describe('Skenario F — Struktur Header dan Regresi Roundtrip', () => {
    it('mengenali header siswa meskipun urutan kolom identitas berbeda', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Columns ordered: Nama Siswa, L/P, NIS, No
      const rawRows = [
        ['Nama Siswa', 'L/P', 'NIS', 'No', 'Tugas 1 (ASSIGNMENT - 30%)'],
        ['Ahmad Fauzi Ramadhan', 'L', '202601', 1, 92],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(92);
    });

    it('membatalkan import jika tidak ada kolom asesmen yang cocok sama sekali', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Asesmen Lama 1', 'Asesmen Lama 2'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 80, 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain('Tidak ada kolom penilaian yang cocok');
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });

    it('mendukung penuh roundtrip hasil ekspor DADU resmi', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Matches exact output of handleExportExcel
      const exportedFile = [
        ['DAFTAR NILAI AKADEMIK - Matematika'],
        ['Kelas: X-A | Tahun Ajaran: 2026/2027 (GANJIL)'],
        ['Metode: Rata-rata Berbobot | KKTP: 75'],
        [],
        [
          'No',
          'NIS',
          'NISN',
          'Nama Siswa',
          'L/P',
          'Tugas 1 (ASSIGNMENT - 30%)',
          'Ulangan Harian 1 (QUIZ - 70%)',
          'Nilai Akhir',
          'Predikat',
          'Status Ketuntasan',
        ],
        [1, '202601', '0012345678', 'Ahmad Fauzi Ramadhan', 'L', 80, 90, 87, 'A', 'TUNTAS'],
        [2, '202602', '0012345679', 'Ahmad Fauzi', 'L', 70, 75, 73.5, 'B', 'REMEDIAL'],
        [3, '202603', '0012345680', 'Budi Santoso', 'L', 95, 100, 98.5, 'A', 'TUNTAS'],
        [4, '202604', '0012345681', 'Citra Dewi', 'P', 88, 82, 83.8, 'A', 'TUNTAS'],
      ];

      const result = parseGradesExcel(exportedFile, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.fatalError).toBeNull();
      expect(result.totalProcessedStudents).toBe(4);
      expect(result.totalSkippedStudents).toBe(0);
      expect(result.totalInvalidScores).toBe(0);
      expect(result.totalAppliedScores).toBe(8);

      // Verify each student and item score matches exactly
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(80);
      expect(result.scoresToApply['std_1_item_uh1']).toBe(90);

      expect(result.scoresToApply['std_2_item_tugas1']).toBe(70);
      expect(result.scoresToApply['std_2_item_uh1']).toBe(75);

      expect(result.scoresToApply['std_3_item_tugas1']).toBe(95);
      expect(result.scoresToApply['std_3_item_uh1']).toBe(100);

      expect(result.scoresToApply['std_4_item_tugas1']).toBe(88);
      expect(result.scoresToApply['std_4_item_uh1']).toBe(82);
    });
  });

  // =========================================================================
  // SKENARIO G — DIAGNOSTICS FEEDBACK DAN STATE DECISIONS (STAGE 2.3)
  // =========================================================================
  describe('Skenario G — Diagnostics Feedback dan State Decisions (Stage 2.3)', () => {
    it('Kondisi 1: nol nilai berhasil dipetakan karena baris siswa ditolak -> shouldApplyScores false, menampilkan detail penolakan dan state nilai tidak berubah', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Row 1 has unknown NIS, Row 2 has unknown NISN mismatch
      const rawRows = [
        ['No', 'NIS', 'NISN', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '999999', '', 'Siswa Asing 1', 90],
        [2, '202601', '9999999999', 'Ahmad Fauzi Ramadhan', 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      // Verify shouldApplyScores is false and no scores to apply
      expect(feedback.shouldApplyScores).toBe(false);
      expect(Object.keys(feedback.scoresToApply)).toHaveLength(0);
      expect(feedback.saveSuccessMessage).toBeNull();
      expect(feedback.toastType).toBe('warning');

      // Verify diagnostics report rejected rows and specific issue details
      expect(feedback.toastMessage).toContain('Tidak ada nilai yang diimpor');
      expect(feedback.toastMessage).toContain('2 baris siswa dilewati');
      expect(feedback.toastMessage).toContain('Baris 2:');
      expect(feedback.toastMessage).toContain('Baris 3:');
      expect(feedback.toastMessage).toContain("NISN '9999999999' tidak cocok");

      // Verify that simulating state update with shouldApplyScores leaves state untouched
      let scoresMap: Record<string, number> = { std_1_item_tugas1: 70 };
      let isDirty = false;
      if (feedback.shouldApplyScores) {
        scoresMap = { ...scoresMap, ...feedback.scoresToApply };
        isDirty = true;
      }
      expect(scoresMap['std_1_item_tugas1']).toBe(70);
      expect(isDirty).toBe(false);
    });

    it('Kondisi 2: nol nilai berhasil dipetakan akibat nilai tidak valid -> guru menerima laporan informatif dan state nilai tidak berubah', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Student matches, but all scores are invalid format/range
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 'abs', 150],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      expect(feedback.shouldApplyScores).toBe(false);
      expect(Object.keys(feedback.scoresToApply)).toHaveLength(0);
      expect(feedback.saveSuccessMessage).toBeNull();
      expect(feedback.toastType).toBe('warning');

      expect(feedback.toastMessage).toContain('Tidak ada nilai yang diimpor');
      expect(feedback.toastMessage).toContain('2 nilai tidak valid');
      expect(feedback.toastMessage).toContain('bukan angka nilai yang valid');
      expect(feedback.toastMessage).toContain('di luar rentang yang diizinkan');

      // State remains unchanged
      let scoresMap: Record<string, number> = { std_1_item_tugas1: 75 };
      let isDirty = false;
      if (feedback.shouldApplyScores) {
        scoresMap = { ...scoresMap, ...feedback.scoresToApply };
        isDirty = true;
      }
      expect(scoresMap['std_1_item_tugas1']).toBe(75);
      expect(isDirty).toBe(false);
    });

    it('Kondisi 3: nol nilai berhasil dipetakan dengan kolom asing -> nama kolom asing dilaporkan dan state tidak berubah', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Valid student, but score columns are empty; includes foreign unrecognized column
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Catatan Walikelas', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 'Baik sekali', ''],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      expect(feedback.shouldApplyScores).toBe(false);
      expect(Object.keys(feedback.scoresToApply)).toHaveLength(0);
      expect(feedback.saveSuccessMessage).toBeNull();
      expect(feedback.toastType).toBe('warning');

      expect(feedback.toastMessage).toContain('Tidak ada nilai yang diimpor');
      expect(feedback.toastMessage).toContain('1 kolom tidak dikenal dilewati (Catatan Walikelas)');

      let isDirty = false;
      if (feedback.shouldApplyScores) {
        isDirty = true;
      }
      expect(isDirty).toBe(false);
    });

    it('Kondisi 4: ada nilai valid dan ada masalah -> nilai valid dapat dimuat secara lokal dan peringatan parsial dilaporkan', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // 1 valid score, 1 invalid score, 1 foreign column
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Catatan Guru', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 'Rajin', 88, 'invalid_score'],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      expect(feedback.shouldApplyScores).toBe(true);
      expect(feedback.scoresToApply['std_1_item_tugas1']).toBe(88);
      expect(feedback.scoresToApply['std_1_item_uh1']).toBeUndefined();
      expect(feedback.status).toBe('warning');
      expect(feedback.toastType).toBe('warning');

      expect(feedback.toastMessage).toContain('Import selesai sebagian');
      expect(feedback.toastMessage).toContain('1 nilai dimuat');
      expect(feedback.toastMessage).toContain('1 nilai tidak valid');
      expect(feedback.toastMessage).toContain('1 kolom tidak dikenal dilewati (Catatan Guru)');
      expect(feedback.toastMessage).toContain('Klik "Simpan Perubahan" untuk menyimpan ke cloud.');
      expect(feedback.saveSuccessMessage).toBe(feedback.toastMessage);

      // Verify that applying state works properly
      let scoresMap: Record<string, number> = {};
      let isDirty = false;
      if (feedback.shouldApplyScores) {
        scoresMap = { ...scoresMap, ...feedback.scoresToApply };
        isDirty = true;
      }
      expect(scoresMap['std_1_item_tugas1']).toBe(88);
      expect(isDirty).toBe(true);
    });

    it('Kondisi 5: import tanpa masalah -> status success, shouldApplyScores true, dan pesan sukses bersih ditampilkan', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 85, 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      expect(feedback.shouldApplyScores).toBe(true);
      expect(feedback.status).toBe('success');
      expect(feedback.toastType).toBe('success');
      expect(feedback.toastMessage).toBe(
        'Import Excel berhasil! 2 nilai berhasil dimuat. Klik "Simpan Perubahan" untuk menyimpan ke cloud.'
      );
      expect(feedback.saveSuccessMessage).toBe(feedback.toastMessage);
    });

    it('Kondisi 6: nol nilai berhasil dipetakan tanpa detail masalah spesifik (sel kosong semua) -> pesan informatif umum', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Headers and students are matched, but all assessment cells are empty
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', ''],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      expect(feedback.shouldApplyScores).toBe(false);
      expect(Object.keys(feedback.scoresToApply)).toHaveLength(0);
      expect(feedback.toastType).toBe('warning');
      expect(feedback.toastMessage).toBe('Tidak ada nilai valid yang dapat diimpor dari file Excel.');
    });
  });


  // =========================================================================
  // SKENARIO H — INTEGRITAS DATA & ELIMINASI CELAH AUDIT (STAGE 2.4)
  // =========================================================================
  describe('Skenario H — Integritas Data & Eliminasi Celah Audit (Stage 2.4)', () => {
    // -----------------------------------------------------------------------
    // 2. Tolak identifier siswa yang duplikat dalam data kelas
    // -----------------------------------------------------------------------
    it('menolak baris jika dua siswa memiliki NIS yang sama (NIS ambigu)', () => {
      const baseEnrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Duplicate NIS 202601 for both std_1 and std_dup
      const collidedEnrollments: Enrollment[] = [
        ...baseEnrollments,
        {
          id: 'enr_dup_nis',
          academicYearId: 'ay_2026',
          classId: 'cls_xa',
          studentId: 'std_dup_nis',
          rollNumber: 5,
          status: 'ACTIVE',
          createdAt: null,
          updatedAt: null,
          student: {
            id: 'std_dup_nis',
            nis: '202601', // Duplicate NIS!
            nisn: '0012345699',
            fullName: 'Siswa Duplikat NIS',
            gender: 'L',
            status: 'ACTIVE',
            createdAt: null,
            updatedAt: null,
          },
        },
      ];

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, collidedEnrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.totalAppliedScores).toBe(0);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_dup_nis_item_tugas1']).toBeUndefined();
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
      expect(
        result.issues.some(i => i.type === 'STUDENT_SKIPPED' && i.message.includes("NIS '202601' ambigu"))
      ).toBe(true);
    });

    it('menolak baris jika dua siswa memiliki NISN yang sama (NISN ambigu)', () => {
      const baseEnrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // Duplicate NISN 0012345680 for both std_3 and std_dup_nisn
      const collidedEnrollments: Enrollment[] = [
        ...baseEnrollments,
        {
          id: 'enr_dup_nisn',
          academicYearId: 'ay_2026',
          classId: 'cls_xa',
          studentId: 'std_dup_nisn',
          rollNumber: 6,
          status: 'ACTIVE',
          createdAt: null,
          updatedAt: null,
          student: {
            id: 'std_dup_nisn',
            nis: '202699',
            nisn: '0012345680', // Duplicate NISN!
            fullName: 'Siswa Duplikat NISN',
            gender: 'L',
            status: 'ACTIVE',
            createdAt: null,
            updatedAt: null,
          },
        },
      ];

      const rawRows = [
        ['No', 'NISN', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '0012345680', 'Budi Santoso', 88],
      ];

      const result = parseGradesExcel(rawRows, collidedEnrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.totalAppliedScores).toBe(0);
      expect(result.scoresToApply['std_3_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_dup_nisn_item_tugas1']).toBeUndefined();
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
      expect(
        result.issues.some(i => i.type === 'STUDENT_SKIPPED' && i.message.includes("NISN '0012345680' ambigu"))
      ).toBe(true);
    });

    // -----------------------------------------------------------------------
    // 3. Validasi konflik antara identifier dan nama
    // -----------------------------------------------------------------------
    it('menolak baris jika NIS valid untuk A, tetapi nama cocok persis dengan B', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // NIS 202601 belongs to std_1, but name "Citra Dewi" belongs to std_4
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', 'Citra Dewi', 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.totalAppliedScores).toBe(0);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_4_item_tugas1']).toBeUndefined();
      expect(
        result.issues.some(i => i.type === 'STUDENT_SKIPPED' && i.message.includes('Konflik identitas'))
      ).toBe(true);
    });

    it('menolak baris jika NIS dan NISN valid untuk A, tetapi nama cocok persis dengan B', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // NIS & NISN belong to std_1, but name belongs to std_4
      const rawRows = [
        ['No', 'NIS', 'NISN', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', '0012345678', 'Citra Dewi', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalSkippedStudents).toBe(1);
      expect(result.totalAppliedScores).toBe(0);
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
      expect(result.scoresToApply['std_4_item_tugas1']).toBeUndefined();
      expect(
        result.issues.some(i => i.type === 'STUDENT_SKIPPED' && i.message.includes('Konflik identitas'))
      ).toBe(true);
    });

    it('memproses baris jika NIS/NISN valid untuk A, sedangkan nama tidak cocok dengan siswa lain mana pun (typo/variasi aman)', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      // NIS 202601 belongs to std_1, name has minor typo/variation not belonging to any student
      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', 'Ahmad Fauzi Typo Aman', 92],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(true);
      expect(result.totalProcessedStudents).toBe(1);
      expect(result.totalSkippedStudents).toBe(0);
      expect(result.totalAppliedScores).toBe(1);
      expect(result.scoresToApply['std_1_item_tugas1']).toBe(92);
    });

    // -----------------------------------------------------------------------
    // 4. Perketat pemetaan header assessment
    // -----------------------------------------------------------------------
    it('menolak pemetaan header dengan suffix arbitrer seperti Tugas 1 (format lama)', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (format lama)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      // Must fail because Tugas 1 (format lama) is NOT mapped to Tugas 1
      expect(result.success).toBe(false);
      expect(result.unmappedColumns).toContain('Tugas 1 (format lama)');
      expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
    });

    it('mendukung pembedaan dua asesmen dengan nama dasar sama menggunakan header ekspor lengkap', () => {
      const enrollments = createMockEnrollments();
      const duplicateBaseItems: AssessmentItem[] = [
        {
          id: 'item_t1_tugas',
          teachingAssignmentId: 'asg_1',
          name: 'Tugas 1',
          category: 'ASSIGNMENT',
          weight: 30,
          maxScore: 100,
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          assessmentDate: '2026-08-10',
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: 'item_t1_uh',
          teachingAssignmentId: 'asg_1',
          name: 'Tugas 1', // Same base name, but different category & weight
          category: 'QUIZ',
          weight: 70,
          maxScore: 100,
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          assessmentDate: '2026-08-10',
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
      ];

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Tugas 1 (QUIZ - 70%)'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 80, 95],
      ];

      const result = parseGradesExcel(rawRows, enrollments, duplicateBaseItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_1_item_t1_tugas']).toBe(80);
      expect(result.scoresToApply['std_1_item_t1_uh']).toBe(95);
      expect(result.totalAppliedScores).toBe(2);
    });

    it('menolak import jika file Excel menggunakan nama dasar saja ketika terdapat dua asesmen bernama sama', () => {
      const enrollments = createMockEnrollments();
      const duplicateBaseItems: AssessmentItem[] = [
        {
          id: 'item_t1_a',
          teachingAssignmentId: 'asg_1',
          name: 'Tugas 1',
          category: 'ASSIGNMENT',
          weight: 30,
          maxScore: 100,
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          assessmentDate: '2026-08-10',
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: 'item_t1_b',
          teachingAssignmentId: 'asg_1',
          name: 'Tugas 1',
          category: 'QUIZ',
          weight: 70,
          maxScore: 100,
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          assessmentDate: '2026-08-10',
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
      ];

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Tugas 1'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 85],
      ];

      const result = parseGradesExcel(rawRows, enrollments, duplicateBaseItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain('ambigu');
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });

    // -----------------------------------------------------------------------
    // 5. Validasi header identitas duplikat dalam file Excel
    // -----------------------------------------------------------------------
    it('menolak import jika terdapat lebih dari satu kolom NIS dalam file Excel', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '202601', '202601', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain("Ditemukan lebih dari satu kolom 'NIS'");
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });

    it('menolak import jika terdapat lebih dari satu kolom NISN dalam file Excel', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NISN', 'NISN', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, '0012345678', '0012345678', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain("Ditemukan lebih dari satu kolom 'NISN'");
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });

    it('menolak import jika terdapat lebih dari satu kolom Nama Siswa dalam file Excel', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'Nama Siswa', 'Nama Lengkap', 'Tugas 1 (ASSIGNMENT - 30%)'],
        [1, 'Ahmad Fauzi Ramadhan', 'Ahmad Fauzi Ramadhan', 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain("Ditemukan lebih dari satu kolom 'Nama Siswa'");
      expect(Object.keys(result.scoresToApply)).toHaveLength(0);
    });

    // -----------------------------------------------------------------------
    // 6. Batasi kolom ringkasan dan dukung asesmen dengan nama mirip alias generik
    // -----------------------------------------------------------------------
    it('mendukung asesmen yang bernama mirip alias ringkasan generik lama (misal: Status)', () => {
      const enrollments = createMockEnrollments();
      const customItems: AssessmentItem[] = [
        {
          id: 'item_status',
          teachingAssignmentId: 'asg_1',
          name: 'Status', // Was swallowed by old alias!
          category: 'ASSIGNMENT',
          weight: 100,
          maxScore: 100,
          academicYearId: 'ay_2026',
          semester: 'GANJIL',
          classId: 'cls_xa',
          subjectId: 'sbj_math',
          assessmentDate: '2026-08-10',
          isIncludedInFinalScore: true,
          createdAt: null,
          updatedAt: null,
        },
      ];

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Status'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 95],
      ];

      const result = parseGradesExcel(rawRows, enrollments, customItems);

      expect(result.success).toBe(true);
      expect(result.scoresToApply['std_1_item_status']).toBe(95);
      expect(result.totalAppliedScores).toBe(1);
    });

    // -----------------------------------------------------------------------
    // 7. Diagnosa pada kegagalan fatal menyertakan kolom yang ditemukan di file
    // -----------------------------------------------------------------------
    it('menyertakan nama kolom tidak dikenal pada pesan kegagalan fatal ketika tidak ada asesmen yang cocok', () => {
      const enrollments = createMockEnrollments();
      const assessmentItems = createMockAssessmentItems();

      const rawRows = [
        ['No', 'NIS', 'Nama Siswa', 'Asesmen Lama 1', 'Asesmen Lama 2'],
        [1, '202601', 'Ahmad Fauzi Ramadhan', 80, 90],
      ];

      const result = parseGradesExcel(rawRows, enrollments, assessmentItems);
      const feedback = buildGradesImportFeedback(result);

      expect(result.success).toBe(false);
      expect(result.fatalError).toContain('Asesmen Lama 1');
      expect(result.fatalError).toContain('Asesmen Lama 2');
      expect(feedback.toastType).toBe('error');
      expect(feedback.toastMessage).toContain('Asesmen Lama 1');
      expect(feedback.toastMessage).toContain('Asesmen Lama 2');
      expect(feedback.shouldApplyScores).toBe(false);
      expect(Object.keys(feedback.scoresToApply)).toHaveLength(0);
    });
  });


  // =========================================================================
  // SKENARIO I — PRESISI NILAI & KONFLIK HEADER RINGKASAN (STAGE 2.5)
  // =========================================================================
  describe('Skenario I — Presisi Nilai dan Tabrakan Header Ringkasan (Stage 2.5)', () => {
    describe('Presisi Nilai Excel (Tanpa Pembulatan Tambahan)', () => {
      it('mempertahankan presisi nilai desimal 85.75 dan 85,75 tanpa pembulatan', () => {
        const enrollments = createMockEnrollments();
        const assessmentItems = createMockAssessmentItems();

        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', 85.75, '85,75'],
        ];

        const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

        expect(result.success).toBe(true);
        expect(result.totalInvalidScores).toBe(0);
        expect(result.totalAppliedScores).toBe(2);
        // Membuktikan nilai tidak dibulatkan ke 85.8
        expect(result.scoresToApply['std_1_item_tugas1']).toBe(85.75);
        expect(result.scoresToApply['std_1_item_uh1']).toBe(85.75);
      });

      it('memproses nilai bulat dan batas 0 serta 100 dengan benar', () => {
        const enrollments = createMockEnrollments();
        const assessmentItems = createMockAssessmentItems();

        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', 0, 100],
          [2, '202602', 'Ahmad Fauzi', 75, 80],
        ];

        const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

        expect(result.success).toBe(true);
        expect(result.totalInvalidScores).toBe(0);
        expect(result.totalAppliedScores).toBe(4);
        expect(result.scoresToApply['std_1_item_tugas1']).toBe(0);
        expect(result.scoresToApply['std_1_item_uh1']).toBe(100);
        expect(result.scoresToApply['std_2_item_tugas1']).toBe(75);
        expect(result.scoresToApply['std_2_item_uh1']).toBe(80);
      });

      it('tetap menolak nilai di luar rentang 0-100 dan teks invalid tanpa mengubah validasi yang ada', () => {
        const enrollments = createMockEnrollments();
        const assessmentItems = createMockAssessmentItems();

        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Tugas 1 (ASSIGNMENT - 30%)', 'Ulangan Harian 1 (QUIZ - 70%)'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', -0.01, 100.01],
          [2, '202602', 'Ahmad Fauzi', '85xyz', 'invalid'],
        ];

        const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

        expect(result.success).toBe(true);
        expect(result.totalInvalidScores).toBe(4);
        expect(result.totalAppliedScores).toBe(0);
        expect(result.scoresToApply['std_1_item_tugas1']).toBeUndefined();
        expect(result.scoresToApply['std_1_item_uh1']).toBeUndefined();
        expect(result.scoresToApply['std_2_item_tugas1']).toBeUndefined();
        expect(result.scoresToApply['std_2_item_uh1']).toBeUndefined();
      });
    });

    describe('Penanganan Konflik Nama Asesmen dengan Label Ringkasan Resmi', () => {
      it('menolak import secara fail-safe ketika header sederhana identik dengan label ringkasan resmi dan cocok dengan asesmen aktif', () => {
        const enrollments = createMockEnrollments();
        const customItems: AssessmentItem[] = [
          {
            id: 'item_predikat',
            name: 'Predikat',
            category: 'ASSIGNMENT',
            weight: 30,
            maxScore: 100,
            teachingAssignmentId: 'ta_1',
            academicYearId: 'ay_2026',
            semester: 'GANJIL',
            classId: 'cls_xa',
            subjectId: 'sbj_math',
            assessmentDate: '2026-08-01',
            isIncludedInFinalScore: true,
            createdAt: null,
            updatedAt: null,
          },
        ];

        // File uses bare header 'Predikat'
        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Predikat'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', 85.75],
        ];

        const result = parseGradesExcel(rawRows, enrollments, customItems);

        expect(result.success).toBe(false);
        expect(result.fatalError).toContain("Header 'Predikat' bertentangan dengan label ringkasan resmi DADU");
        expect(result.fatalError).toContain("Gunakan format header ekspor lengkap DADU");
        expect(result.fatalError).toContain("Predikat (ASSIGNMENT - 30%)");
        expect(result.totalAppliedScores).toBe(0);
        expect(result.scoresToApply['std_1_item_predikat']).toBeUndefined();
        expect(Object.keys(result.scoresToApply)).toHaveLength(0);
      });

      it('menolak import ketika salah satu dari dua asesmen bernama Predikat belum dipetakan oleh header lengkap dan kolom Predikat tetap ambigu', () => {
        const enrollments = createMockEnrollments();
        const customItems: AssessmentItem[] = [
          {
            id: 'item_predikat_tugas',
            name: 'Predikat',
            category: 'ASSIGNMENT',
            weight: 30,
            maxScore: 100,
            teachingAssignmentId: 'ta_1',
            academicYearId: 'ay_2026',
            semester: 'GANJIL',
            classId: 'cls_xa',
            subjectId: 'sbj_math',
            assessmentDate: '2026-08-01',
            isIncludedInFinalScore: true,
            createdAt: null,
            updatedAt: null,
          },
          {
            id: 'item_predikat_uh',
            name: 'Predikat',
            category: 'QUIZ',
            weight: 70,
            maxScore: 100,
            teachingAssignmentId: 'ta_1',
            academicYearId: 'ay_2026',
            semester: 'GANJIL',
            classId: 'cls_xa',
            subjectId: 'sbj_math',
            assessmentDate: '2026-08-10',
            isIncludedInFinalScore: true,
            createdAt: null,
            updatedAt: null,
          },
        ];

        // Header: NIS, Predikat (ASSIGNMENT - 30%), Predikat
        // Distinct values (85.5 vs 92.5) to ensure mapping errors are immediately evident
        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Predikat (ASSIGNMENT - 30%)', 'Predikat'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', 85.5, 92.5],
        ];

        const result = parseGradesExcel(rawRows, enrollments, customItems);

        expect(result.success).toBe(false);
        expect(result.fatalError).toContain("Header 'Predikat' bertentangan dengan label ringkasan resmi DADU");
        expect(result.fatalError).toContain("Gunakan format header ekspor lengkap DADU");
        expect(result.totalAppliedScores).toBe(0);
        // Memastikan tidak ada skor yang diterapkan ke siswa atau assessment ID mana pun
        expect(result.scoresToApply['std_1_item_predikat_tugas']).toBeUndefined();
        expect(result.scoresToApply['std_1_item_predikat_uh']).toBeUndefined();
        expect(Object.keys(result.scoresToApply)).toHaveLength(0);
      });

      it('memetakan header ekspor lengkap Predikat (ASSIGNMENT - 30%) ke asesmen yang benar dan mengabaikan kolom ringkasan Predikat', () => {
        const enrollments = createMockEnrollments();
        const customItems: AssessmentItem[] = [
          {
            id: 'item_predikat',
            name: 'Predikat',
            category: 'ASSIGNMENT',
            weight: 30,
            maxScore: 100,
            teachingAssignmentId: 'ta_1',
            academicYearId: 'ay_2026',
            semester: 'GANJIL',
            classId: 'cls_xa',
            subjectId: 'sbj_math',
            assessmentDate: '2026-08-01',
            isIncludedInFinalScore: true,
            createdAt: null,
            updatedAt: null,
          },
        ];

        // File has both full export header and the summary column
        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Predikat (ASSIGNMENT - 30%)', 'Predikat'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', 88.5, 'A'],
        ];

        const result = parseGradesExcel(rawRows, enrollments, customItems);

        expect(result.success).toBe(true);
        expect(result.totalAppliedScores).toBe(1);
        expect(result.scoresToApply['std_1_item_predikat']).toBe(88.5);
        // Verify summary column value 'A' was ignored and not imported
        expect(Object.values(result.scoresToApply)).not.toContain('A');
      });

      it('mengabaikan kolom ringkasan resmi tanpa konflik dan tidak mengimpornya sebagai nilai mentah', () => {
        const enrollments = createMockEnrollments();
        const assessmentItems = createMockAssessmentItems(); // Tugas 1 & Ulangan Harian 1, tidak ada asesmen bernama Nilai Akhir / Predikat / Status Ketuntasan

        const rawRows = [
          ['No', 'NIS', 'Nama Siswa', 'Tugas 1', 'Nilai Akhir', 'Predikat', 'Status Ketuntasan'],
          [1, '202601', 'Ahmad Fauzi Ramadhan', 92.25, 92.25, 'A', 'TUNTAS'],
        ];

        const result = parseGradesExcel(rawRows, enrollments, assessmentItems);

        expect(result.success).toBe(true);
        expect(result.totalAppliedScores).toBe(1);
        expect(result.scoresToApply['std_1_item_tugas1']).toBe(92.25);
        expect(result.unmappedColumns).toHaveLength(0);
        // Verify summary values did not leak
        const allScores = Object.values(result.scoresToApply);
        expect(allScores).not.toContain('A');
        expect(allScores).not.toContain('TUNTAS');
        expect(Object.keys(result.scoresToApply)).toHaveLength(1);
      });
    });
  });

  // =========================================================================
  // SKENARIO J — DETEKSI HEADER KANONIKAL & RESOLUSI WORKSHEET MULTI-SHEET
  // =========================================================================
  describe('Skenario J — Deteksi Header Kanonikal & Resolusi Worksheet Multi-Sheet', () => {
    describe('findGradesHeaderRow', () => {
      it('menemukan indeks baris header pada baris pertama', () => {
        const rows = [
          ['No', 'NIS', 'Nama Siswa', 'Tugas 1'],
          [1, '1001', 'Ahmad Dahlan', 90],
        ];
        expect(findGradesHeaderRow(rows)).toBe(0);
      });

      it('menemukan indeks baris header setelah baris metadata / kop', () => {
        const rows = [
          ['DAFTAR NILAI AKADEMIK'],
          ['Tahun Pelajaran 2025/2026'],
          [],
          ['No', 'NISN', 'Nama Siswa', 'Ulangan Harian 1'],
          [1, '0012345678', 'Ahmad Dahlan', 85],
        ];
        expect(findGradesHeaderRow(rows)).toBe(3);
      });

      it('mengembalikan -1 jika tidak ada header identitas siswa dalam 15 baris pertama', () => {
        const rows = [
          ['PETUNJUK PENGISIAN'],
          ['1. Baca panduan'],
          ['2. Isikan data'],
        ];
        expect(findGradesHeaderRow(rows)).toBe(-1);
      });

      it('mengembalikan -1 untuk input kosong atau bukan array', () => {
        expect(findGradesHeaderRow([])).toBe(-1);
        expect(findGradesHeaderRow(null as any)).toBe(-1);
      });
    });

    describe('resolveGradesWorksheetData', () => {
      const mockXLSX = {
        utils: {
          sheet_to_json: (ws: any) => ws._rows || [],
        },
      };

      it('melempar error jika tidak ada worksheet yang tersedia', () => {
        const wb = { SheetNames: [], Sheets: {} };
        expect(() => resolveGradesWorksheetData(wb, mockXLSX)).toThrow(
          'Lembar kerja (worksheet) tidak ditemukan'
        );
      });

      it('memprioritaskan sheet bernama standar jika memiliki header siswa valid', () => {
        const wsCover = { _rows: [['COVER BUKU']] };
        const wsNilai = {
          _rows: [
            ['No', 'NIS', 'Nama Siswa', 'Tugas 1'],
            [1, '1001', 'Ahmad Dahlan', 90],
          ],
        };
        const wb = {
          SheetNames: ['Petunjuk', 'Nilai Akademik'],
          Sheets: {
            Petunjuk: wsCover,
            'Nilai Akademik': wsNilai,
          },
        };

        const result = resolveGradesWorksheetData(wb, mockXLSX);
        expect(result.sheetName).toBe('Nilai Akademik');
        expect(result.data).toEqual(wsNilai._rows);
      });

      it('mengabaikan sheet bernama standar yang tidak memiliki header siswa dan memilih sheet yang valid', () => {
        const wsNilaiKosong = { _rows: [['RINGKASAN UMUM']] };
        const wsData = {
          _rows: [
            ['No', 'Nama Siswa', 'NIS', 'Tugas 1'],
            [1, 'Ahmad Dahlan', '1001', 95],
          ],
        };
        const wb = {
          SheetNames: ['Nilai Akademik', 'Sheet Nilai Asli'],
          Sheets: {
            'Nilai Akademik': wsNilaiKosong,
            'Sheet Nilai Asli': wsData,
          },
        };

        const result = resolveGradesWorksheetData(wb, mockXLSX);
        expect(result.sheetName).toBe('Sheet Nilai Asli');
        expect(result.data).toEqual(wsData._rows);
      });

      it('memindai secara berurutan untuk sheet dengan nama non-standar yang memiliki header siswa valid', () => {
        const wsCover = { _rows: [['CATATAN GURU']] };
        const wsKelas = {
          _rows: [
            ['No', 'NISN', 'Nama Siswa', 'Tugas 1'],
            [1, '0012345678', 'Ahmad Dahlan', 88],
          ],
        };
        const wb = {
          SheetNames: ['Catatan', 'Kelas 7B'],
          Sheets: {
            Catatan: wsCover,
            'Kelas 7B': wsKelas,
          },
        };

        const result = resolveGradesWorksheetData(wb, mockXLSX);
        expect(result.sheetName).toBe('Kelas 7B');
        expect(result.data).toEqual(wsKelas._rows);
      });

      it('fallback ke sheet pertama jika tidak ada sheet yang memiliki header siswa (untuk diagnostik parser)', () => {
        const ws1 = { _rows: [['PETUNJUK 1']] };
        const ws2 = { _rows: [['PETUNJUK 2']] };
        const wb = {
          SheetNames: ['Sheet1', 'Sheet2'],
          Sheets: {
            Sheet1: ws1,
            Sheet2: ws2,
          },
        };

        const result = resolveGradesWorksheetData(wb, mockXLSX);
        expect(result.sheetName).toBe('Sheet1');
        expect(result.data).toEqual(ws1._rows);
      });
    });
  });

});
