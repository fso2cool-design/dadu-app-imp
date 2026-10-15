import { describe, it, expect } from 'vitest';
import { normalizePastedLines, parsePastedScores } from './pasteExcelParser';
import { Enrollment } from '../../types';

describe('pasteExcelParser', () => {
  const mockEnrollments: Enrollment[] = [
    { id: 'enr-1', studentId: 'stu-1', rollNumber: 1, student: { fullName: 'Ahmad Dahlan' } } as unknown as Enrollment,
    { id: 'enr-2', studentId: 'stu-2', rollNumber: 2, student: { fullName: 'Budi Santoso' } } as unknown as Enrollment,
    { id: 'enr-3', studentId: 'stu-3', rollNumber: 3, student: { fullName: 'Citra Dewi' } } as unknown as Enrollment,
    { id: 'enr-4', studentId: 'stu-4', rollNumber: 4, student: { fullName: 'Dedi Kurniawan' } } as unknown as Enrollment,
  ];

  describe('normalizePastedLines', () => {
    it('10a. strips single terminal newline (standard spreadsheet copy artifact)', () => {
      expect(normalizePastedLines('85\n90\n')).toEqual(['85', '90']);
      expect(normalizePastedLines('85\r\n90\r\n')).toEqual(['85', '90']);
    });

    it('10b. preserves empty lines in the middle', () => {
      expect(normalizePastedLines('85\n\n90')).toEqual(['85', '', '90']);
      expect(normalizePastedLines('85\r\n\r\n90')).toEqual(['85', '', '90']);
    });

    it('10c. returns empty array for blank or whitespace-only input', () => {
      expect(normalizePastedLines('')).toEqual([]);
      expect(normalizePastedLines('   \n\t  ')).toEqual([]);
    });
  });

  describe('parsePastedScores', () => {
    it('1. maps valid score column according to roster order', () => {
      const input = '85\n90\n78\n92';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
      expect(result.validScoreCount).toBe(4);
      expect(result.scoresToApply).toEqual({
        'stu-1': 85,
        'stu-2': 90,
        'stu-3': 78,
        'stu-4': 92,
      });
      expect(result.rows[0].studentName).toBe('Ahmad Dahlan');
      expect(result.rows[1].studentName).toBe('Budi Santoso');
    });

    it('2. empty line in the middle does not shift subsequent students', () => {
      // Line 2 is empty -> Student 2 gets no score, Student 3 MUST get 90
      const input = '85\n\n90';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(true);
      expect(result.emptyRowCount).toBe(1);
      expect(result.validScoreCount).toBe(2);

      // Student 1 gets 85
      expect(result.rows[0].studentId).toBe('stu-1');
      expect(result.rows[0].score).toBe(85);

      // Student 2 is empty/null, NOT in scoresToApply
      expect(result.rows[1].studentId).toBe('stu-2');
      expect(result.rows[1].score).toBeNull();
      expect(result.rows[1].isEmpty).toBe(true);

      // Student 3 gets 90 (NOT shifted to student 2!)
      expect(result.rows[2].studentId).toBe('stu-3');
      expect(result.rows[2].score).toBe(90);

      expect(result.scoresToApply).toEqual({
        'stu-1': 85,
        'stu-3': 90,
      });
      expect(result.scoresToApply['stu-2']).toBeUndefined();
    });

    it('3. fewer rows than enrollments handled explicitly without silent shifting', () => {
      // 2 rows for 4 enrollments
      const input = '88\n91';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(true);
      expect(result.rows.length).toBe(2);
      expect(result.warningMessage).toContain('Hanya 2 dari 4 siswa yang memiliki baris nilai');
      expect(result.scoresToApply).toEqual({
        'stu-1': 88,
        'stu-2': 91,
      });
    });

    it('4. excess rows (> enrollments.length) are rejected and not silently ignored', () => {
      // 5 rows for 4 enrollments
      const input = '80\n85\n90\n95\n100';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(false);
      expect(result.excessRowCount).toBe(1);
      expect(result.errorMessage).toContain('melebihi jumlah siswa di kelas (4)');
      expect(result.scoresToApply).toEqual({});
      expect(result.rows[4].isValid).toBe(false);
      expect(result.rows[4].errorMessage).toContain('melebihi jumlah siswa');
    });

    it('5. multi-column input (tabs, semicolons, multiple commas) is rejected', () => {
      const tabInput = '1\t85\n2\t90';
      const tabResult = parsePastedScores(tabInput, mockEnrollments);
      expect(tabResult.isValid).toBe(false);
      expect(tabResult.errorMessage).toContain('Terdeteksi data multi-kolom');
      expect(tabResult.scoresToApply).toEqual({});

      const semiInput = '85;90';
      const semiResult = parsePastedScores(semiInput, mockEnrollments);
      expect(semiResult.isValid).toBe(false);
      expect(semiResult.errorMessage).toContain('Terdeteksi data multi-kolom');

      const multiCommaInput = '85,90,95';
      const multiCommaResult = parsePastedScores(multiCommaInput, mockEnrollments);
      expect(multiCommaResult.isValid).toBe(false);
      expect(multiCommaResult.errorMessage).toContain('Terdeteksi beberapa nilai');
    });

    it('6. decimal dot and decimal comma parsed correctly as single column value', () => {
      const input = '87.5\n87,5\n90.25';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(true);
      expect(result.rows[0].score).toBe(87.5);
      expect(result.rows[1].score).toBe(87.5); // Comma correctly treated as decimal
      expect(result.rows[2].score).toBe(90.3); // Rounded to 1 decimal place
      expect(result.scoresToApply['stu-1']).toBe(87.5);
      expect(result.scoresToApply['stu-2']).toBe(87.5);
    });

    it('7. zero, 100, and intermediate values are valid and rounded to 1 decimal place', () => {
      const input = '0\n100\n0,0\n99.94';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(true);
      expect(result.rows[0].score).toBe(0);
      expect(result.rows[1].score).toBe(100);
      expect(result.rows[2].score).toBe(0);
      expect(result.rows[3].score).toBe(99.9);
      expect(result.scoresToApply['stu-1']).toBe(0);
      expect(result.scoresToApply['stu-2']).toBe(100);
    });

    it('8. alphanumeric tokens such as 85abc are rejected', () => {
      const input = '85abc\n90';
      const result = parsePastedScores(input, mockEnrollments);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('"85abc" bukan angka nilai yang valid');
      expect(result.scoresToApply).toEqual({});
      expect(result.rows[0].isValid).toBe(false);
    });

    it('9. negative values and scores over 100 are rejected', () => {
      const negInput = '-5\n85';
      const negResult = parsePastedScores(negInput, mockEnrollments);
      expect(negResult.isValid).toBe(false);
      expect(negResult.errorMessage).toContain('bukan angka nilai yang valid');

      const highInput = '105\n85';
      const highResult = parsePastedScores(highInput, mockEnrollments);
      expect(highResult.isValid).toBe(false);
      expect(highResult.errorMessage).toContain('di luar rentang valid');
    });

    it('10. handles empty input gracefully without errors', () => {
      const result = parsePastedScores('', mockEnrollments);
      expect(result.isValid).toBe(false);
      expect(result.rows).toEqual([]);
      expect(result.scoresToApply).toEqual({});
    });
  });
});
