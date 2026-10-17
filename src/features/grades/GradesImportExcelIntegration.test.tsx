import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GradesPage, MAX_EXCEL_FILE_SIZE_BYTES, ALLOWED_EXCEL_EXTENSIONS } from './GradesPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';
import * as toastModule from '../../context/ToastContext';
import { loadXlsx } from '../../utils/lazyXlsx';
import { AssessmentItem, Enrollment } from '../../types';

vi.mock('../../utils/lazyXlsx', () => ({
  loadXlsx: vi.fn(),
}));

describe('GradesPage Excel Import Hardening & Characterization', () => {
  const mockToastSuccess = vi.fn();
  const mockToastError = vi.fn();
  const mockToastWarning = vi.fn();
  const mockToastInfo = vi.fn();

  const mockGetAssessmentItems = vi.fn();
  const mockGetByClass = vi.fn();
  const mockGetScoresByItemIds = vi.fn();
  const mockTriggerSyncFeedback = vi.fn();

  const mockApp = {
    grades: {
      getAssessmentItems: mockGetAssessmentItems,
      getScoresByItemIds: mockGetScoresByItemIds,
      canDeleteAssessmentItem: vi.fn().mockResolvedValue({ canDelete: true }),
    },
    enrollment: {
      getByClass: mockGetByClass,
    },
  } as any;

  const mockAssignment = {
    id: 'ta-1',
    classId: 'cls-1',
    className: '7A',
    subjectId: 'sub-1',
    subjectName: 'Matematika',
    academicYearId: 'ay-2025',
    semester: 'GANJIL',
    isActive: true,
  };

  const mockAssessmentItems: AssessmentItem[] = [
    {
      id: 'item-1',
      academicYearId: 'ay-2025',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta-1',
      classId: 'cls-1',
      subjectId: 'sub-1',
      name: 'Ulangan Harian 1',
      category: 'QUIZ',
      assessmentDate: '2026-10-15',
      maxScore: 100,
      weight: 20,
      isIncludedInFinalScore: true,
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
    },
  ];

  const mockEnrollments: Enrollment[] = [
    {
      id: 'enr-1',
      studentId: 'stu-1',
      rollNumber: 1,
      status: 'ACTIVE',
      academicYearId: 'ay-2025',
      classId: 'cls-1',
      student: { id: 'stu-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
    } as Enrollment,
    {
      id: 'enr-2',
      studentId: 'stu-2',
      rollNumber: 2,
      status: 'ACTIVE',
      academicYearId: 'ay-2025',
      classId: 'cls-1',
      student: { id: 'stu-2', fullName: 'Budi Santoso', nis: '1002', gender: 'L' as const },
    } as Enrollment,
  ];

  const renderComponent = () => {
    return render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAssessmentItems.mockResolvedValue(mockAssessmentItems);
    mockGetByClass.mockResolvedValue(mockEnrollments);
    mockGetScoresByItemIds.mockResolvedValue([]);

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-uid' },
      profile: { uid: 'teacher-uid', role: 'TEACHER', displayName: 'Guru Pengampu' },
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      teachingAssignments: [mockAssignment],
      activeAcademicYear: { id: 'ay-2025', name: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: mockAssignment,
      setSelectedAssignment: vi.fn(),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    } as any);

    vi.spyOn(toastModule, 'useToast').mockReturnValue({
      success: mockToastSuccess,
      error: mockToastError,
      warning: mockToastWarning,
      info: mockToastInfo,
      toast: vi.fn(),
      dismiss: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constants definition', () => {
    it('defines maximum file size as 5 MiB', () => {
      expect(MAX_EXCEL_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    });

    it('defines allowed extensions as .xlsx and .xls', () => {
      expect(ALLOWED_EXCEL_EXTENSIONS).toEqual(['.xlsx', '.xls']);
    });
  });

  describe('Guard validations', () => {
    it('rejects file when academic year is archived (runtime guard)', async () => {
      vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
        teachingAssignments: [mockAssignment],
        activeAcademicYear: { id: 'ay-2025', name: '2025/2026', isArchived: true },
        activeSemester: 'GANJIL',
        selectedAssignment: mockAssignment,
        setSelectedAssignment: vi.fn(),
        triggerSyncFeedback: mockTriggerSyncFeedback,
      } as any);

      const readAsArrayBufferSpy = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
      const readAsBinaryStringSpy = vi.spyOn(FileReader.prototype, 'readAsBinaryString');

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const file = new File(['dummy content'], 'nilai.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockToastWarning).toHaveBeenCalledWith(
        expect.stringMatching(/diarsipkan.*read-only/i)
      );
      expect(readAsArrayBufferSpy).not.toHaveBeenCalled();
      expect(readAsBinaryStringSpy).not.toHaveBeenCalled();
      expect(fileInput.value).toBe('');
    });

    it('rejects file when there are no assessment items (preflight guard)', async () => {
      mockGetAssessmentItems.mockResolvedValue([]);

      const readAsArrayBufferSpy = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
      const readAsBinaryStringSpy = vi.spyOn(FileReader.prototype, 'readAsBinaryString');

      const { container } = renderComponent();
      await screen.findByText('Ekspor Excel');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const file = new File(['dummy content'], 'nilai.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockToastWarning).toHaveBeenCalledWith(
        expect.stringMatching(/Belum ada kolom penilaian/i)
      );
      expect(readAsArrayBufferSpy).not.toHaveBeenCalled();
      expect(readAsBinaryStringSpy).not.toHaveBeenCalled();
      expect(fileInput.value).toBe('');
    });

    it('rejects file with unsupported extensions (.csv, .pdf, .txt, .xlsx.exe, without extension)', async () => {
      const readAsArrayBufferSpy = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
      const readAsBinaryStringSpy = vi.spyOn(FileReader.prototype, 'readAsBinaryString');

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const invalidFiles = [
        new File(['1,2,3'], 'data.csv', { type: 'text/csv' }),
        new File(['pdf-data'], 'dokumen.pdf', { type: 'application/pdf' }),
        new File(['plain text'], 'catatan.txt', { type: 'text/plain' }),
        new File(['binary-payload'], 'nilai.xlsx.exe', { type: 'application/x-msdownload' }),
        new File(['raw-data'], 'nilai_tanpa_ekstensi', { type: 'application/octet-stream' }),
      ];

      for (const file of invalidFiles) {
        mockToastError.mockClear();
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(mockToastError).toHaveBeenCalledWith(
          expect.stringMatching(/Format file tidak didukung/i)
        );
        expect(readAsArrayBufferSpy).not.toHaveBeenCalled();
        expect(readAsBinaryStringSpy).not.toHaveBeenCalled();
        expect(fileInput.value).toBe('');
      }
    });

    it('accepts file with uppercase allowed extension (.XLSX and .XLS)', async () => {
      vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(() => {});

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const upperXlsx = new File(['data'], 'NILAI_AKADEMIK.XLSX', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      fireEvent.change(fileInput, { target: { files: [upperXlsx] } });

      // Should NOT reject with extension error
      expect(mockToastError).not.toHaveBeenCalledWith(
        expect.stringMatching(/Format file tidak didukung/i)
      );
      expect(FileReader.prototype.readAsArrayBuffer).toHaveBeenCalledWith(upperXlsx);
    });

    it('rejects file that exceeds maximum size limit (> 5 MiB)', async () => {
      const readAsArrayBufferSpy = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
      const readAsBinaryStringSpy = vi.spyOn(FileReader.prototype, 'readAsBinaryString');

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const oversizedFile = new File(['oversize'], 'nilai_besar.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      // Override size property to exceed 5 MiB limit
      Object.defineProperty(oversizedFile, 'size', {
        value: MAX_EXCEL_FILE_SIZE_BYTES + 1,
        configurable: true,
      });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/Ukuran file terlalu besar.*5 MB/i)
      );
      expect(readAsArrayBufferSpy).not.toHaveBeenCalled();
      expect(readAsBinaryStringSpy).not.toHaveBeenCalled();
      expect(fileInput.value).toBe('');
    });
  });

  describe('FileReader & XLSX processing', () => {
    it('handles malformed / corrupt Excel file with controlled error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let capturedOnLoad: ((evt: any) => void) | null = null;
      vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: any) {
        capturedOnLoad = this.onload;
      });

      const mockXlsx = {
        read: vi.fn().mockImplementation(() => {
          throw new Error('Corrupt or invalid ZIP structure');
        }),
      };
      (loadXlsx as any).mockResolvedValue(mockXlsx);

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['corrupted-bytes'], 'corrupt.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(capturedOnLoad).toBeDefined();

      // Trigger onload with dummy array buffer inside act
      await act(async () => {
        await capturedOnLoad!({ target: { result: new ArrayBuffer(16) } });
      });

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/Gagal membaca file Excel.*Corrupt/i)
      );
      consoleErrorSpy.mockRestore();
    });

    it('handles empty workbook with controlled error when worksheet is missing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let capturedOnLoad: ((evt: any) => void) | null = null;
      vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: any) {
        capturedOnLoad = this.onload;
      });

      const mockXlsx = {
        read: vi.fn().mockReturnValue({
          SheetNames: [],
          Sheets: {},
        }),
      };
      (loadXlsx as any).mockResolvedValue(mockXlsx);

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['valid-bytes'], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await act(async () => {
        await capturedOnLoad!({ target: { result: new ArrayBuffer(16) } });
      });

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/Gagal membaca file Excel.*Lembar kerja/i)
      );
      consoleErrorSpy.mockRestore();
    });

    it('successfully processes valid Excel via readAsArrayBuffer and updates scores state', async () => {
      let capturedOnLoad: ((evt: any) => void) | null = null;
      const readAsArrayBufferSpy = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: any) {
        capturedOnLoad = this.onload;
      });

      const mockSheetData = [
        ['No', 'NIS', 'Nama Siswa', 'Ulangan Harian 1'],
        [1, '1001', 'Ahmad Dahlan', 90],
        [2, '1002', 'Budi Santoso', 85],
      ];

      const mockXlsx = {
        read: vi.fn().mockReturnValue({
          SheetNames: ['Nilai Akademik'],
          Sheets: {
            'Nilai Akademik': {},
          },
        }),
        utils: {
          sheet_to_json: vi.fn().mockReturnValue(mockSheetData),
        },
      };
      (loadXlsx as any).mockResolvedValue(mockXlsx);

      const { container } = renderComponent();
      await screen.findByText('Ulangan Harian 1');

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const validFile = new File(['valid-sheet-bytes'], 'daftar_nilai.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Verifies modernized readAsArrayBuffer was used
      expect(readAsArrayBufferSpy).toHaveBeenCalledWith(validFile);

      // Simulate onload completion inside act
      const arrayBuffer = new ArrayBuffer(32);
      await act(async () => {
        await capturedOnLoad!({ target: { result: arrayBuffer } });
      });

      // Verifies XLSX.read was called with array type
      expect(mockXlsx.read).toHaveBeenCalledWith(arrayBuffer, { type: 'array' });

      // Verifies toast success was triggered
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/Import Excel berhasil/i)
      );

      // Verifies dirty state and success message banner appear
      expect(screen.getByRole('button', { name: /Simpan Perubahan\*/i })).toBeInTheDocument();
      expect(screen.getByText(/Klik "Simpan Perubahan" untuk menyimpan ke cloud/i)).toBeInTheDocument();
    });
  });
});
