import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicReportViewerPage } from './PublicReportViewerPage';
import { ApplicationProvider } from '../../application/ApplicationContext';

const mockAoaToSheet = vi.fn().mockReturnValue({});
const mockBookNew = vi.fn().mockReturnValue({});
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('../../utils/lazyXlsx', () => ({
  loadXlsx: vi.fn().mockResolvedValue({
    utils: {
      aoa_to_sheet: (...args: any[]) => mockAoaToSheet(...args),
      book_new: () => mockBookNew(),
      book_append_sheet: (...args: any[]) => mockBookAppendSheet(...args),
    },
    writeFile: (...args: any[]) => mockWriteFile(...args),
  }),
}));

describe('PublicReportViewerPage Attendance Performance Classification Parity based on KKM', () => {
  const mockGetSharedReportByToken = vi.fn();
  const mockIncrementView = vi.fn();
  const mockDecrypt = vi.fn();

  const mockApp = {
    reports: {
      getSharedReportByToken: mockGetSharedReportByToken,
      incrementView: mockIncrementView,
      decrypt: mockDecrypt,
    },
  };

  const sampleSummaries = [
    { rollNumber: 1, nis: '1001', nisn: '001', name: 'Siswa 0%', gender: 'L' as const, presentCount: 0, sickCount: 0, permittedCount: 0, absentCount: 10, dispensationCount: 0, totalMeetings: 10, presentPercentage: 0 },
    { rollNumber: 2, nis: '1002', nisn: '002', name: 'Siswa 74%', gender: 'P' as const, presentCount: 7, sickCount: 0, permittedCount: 0, absentCount: 3, dispensationCount: 0, totalMeetings: 10, presentPercentage: 74 },
    { rollNumber: 3, nis: '1003', nisn: '003', name: 'Siswa 75%', gender: 'L' as const, presentCount: 8, sickCount: 0, permittedCount: 0, absentCount: 2, dispensationCount: 0, totalMeetings: 10, presentPercentage: 75 },
    { rollNumber: 4, nis: '1004', nisn: '004', name: 'Siswa 76%', gender: 'P' as const, presentCount: 8, sickCount: 0, permittedCount: 0, absentCount: 2, dispensationCount: 0, totalMeetings: 10, presentPercentage: 76 },
    { rollNumber: 5, nis: '1005', nisn: '005', name: 'Siswa 85%', gender: 'L' as const, presentCount: 9, sickCount: 0, permittedCount: 0, absentCount: 1, dispensationCount: 0, totalMeetings: 10, presentPercentage: 85 },
    { rollNumber: 6, nis: '1006', nisn: '006', name: 'Siswa 86%', gender: 'P' as const, presentCount: 9, sickCount: 0, permittedCount: 0, absentCount: 1, dispensationCount: 0, totalMeetings: 10, presentPercentage: 86 },
    { rollNumber: 7, nis: '1007', nisn: '007', name: 'Siswa 95%', gender: 'L' as const, presentCount: 10, sickCount: 0, permittedCount: 0, absentCount: 0, dispensationCount: 0, totalMeetings: 10, presentPercentage: 95 },
    { rollNumber: 8, nis: '1008', nisn: '008', name: 'Siswa 96%', gender: 'P' as const, presentCount: 10, sickCount: 0, permittedCount: 0, absentCount: 0, dispensationCount: 0, totalMeetings: 10, presentPercentage: 96 },
    { rollNumber: 9, nis: '1009', nisn: '009', name: 'Siswa 100%', gender: 'L' as const, presentCount: 10, sickCount: 0, permittedCount: 0, absentCount: 0, dispensationCount: 0, totalMeetings: 10, presentPercentage: 100 },
  ];

  const buildReportPayload = (kkm?: number) => ({
    id: 'rep-share-1',
    token: 'token-public-att-123',
    reportType: 'ATTENDANCE' as const,
    hasPasscode: false,
    passcode: '',
    payload: {
      title: 'Laporan Rekapitulasi Presensi',
      schoolName: 'MTs DADU Parity Test',
      academicYearLabel: '2026/2027',
      semester: 'GANJIL',
      className: 'Kelas 10-A',
      subjectName: 'Fiqih',
      teacherName: 'Ustadz Pembina',
      generatedDate: '2026-10-16',
      attendanceData: {
        reportMode: 'SUBJECT',
        totalMeetingsOrDays: 10,
        kkm,
        statistics: {
          avgPercentage: 81,
          perfectCount: 1,
          criticalCount: kkm !== undefined ? 3 : null,
        },
        summaries: sampleSummaries,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exact canonical KKM-based performance labels when KKM = 75 in shared payload', async () => {
    mockGetSharedReportByToken.mockResolvedValue(buildReportPayload(75));

    render(
      <ApplicationProvider app={mockApp as any}>
        <PublicReportViewerPage token="token-public-att-123" />
      </ApplicationProvider>
    );

    expect(await screen.findByText('Siswa 0%')).toBeInTheDocument();

    const row0 = screen.getByText('Siswa 0%').closest('tr')!;
    const row74 = screen.getByText('Siswa 74%').closest('tr')!;
    const row75 = screen.getByText('Siswa 75%').closest('tr')!;
    const row76 = screen.getByText('Siswa 76%').closest('tr')!;
    const row85 = screen.getByText('Siswa 85%').closest('tr')!;
    const row86 = screen.getByText('Siswa 86%').closest('tr')!;
    const row95 = screen.getByText('Siswa 95%').closest('tr')!;
    const row96 = screen.getByText('Siswa 96%').closest('tr')!;
    const row100 = screen.getByText('Siswa 100%').closest('tr')!;

    // P <= 75 -> 'Perlu Bimbingan'
    expect(row0).toHaveTextContent('Perlu Bimbingan');
    expect(row74).toHaveTextContent('Perlu Bimbingan');
    expect(row75).toHaveTextContent('Perlu Bimbingan');

    // 75 < P <= 85 -> 'Cukup'
    expect(row76).toHaveTextContent('Cukup');
    expect(row85).toHaveTextContent('Cukup');

    // 85 < P <= 95 -> 'Baik'
    expect(row86).toHaveTextContent('Baik');
    expect(row95).toHaveTextContent('Baik');

    // P > 95 -> 'Sangat Baik'
    expect(row96).toHaveTextContent('Sangat Baik');
    expect(row100).toHaveTextContent('Sangat Baik');

    // Legacy labels must never appear
    const allTableStatusCells = screen.getAllByRole('cell').filter(c => ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan', 'Perlu Pembinaan', 'Cukup Baik'].includes(c.textContent?.trim() || ''));
    const statusTexts = allTableStatusCells.map(c => c.textContent?.trim());
    expect(statusTexts).not.toContain('Perlu Pembinaan');
    expect(statusTexts).not.toContain('Cukup Baik');

    // Statistics card displays KKM threshold and valid critical student count
    const criticalCard = screen.getByText('Perlu Bimbingan (≤75%)').closest('div')!;
    expect(criticalCard).toHaveTextContent('3 Siswa');
  });

  it('exports canonical KKM-based performance labels to downloaded spreadsheet with strict UI parity', async () => {
    mockGetSharedReportByToken.mockResolvedValue(buildReportPayload(75));

    render(
      <ApplicationProvider app={mockApp as any}>
        <PublicReportViewerPage token="token-public-att-123" />
      </ApplicationProvider>
    );

    expect(await screen.findByText('Siswa 75%')).toBeInTheDocument();

    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockAoaToSheet).toHaveBeenCalled();
    });

    const sheetData = mockAoaToSheet.mock.calls[0][0];

    // Find student rows in generated Excel sheetData (Column 4: name, Column 13: status)
    const findRow = (name: string) => sheetData.find((r: any[]) => r && r[4] === name);

    expect(findRow('Siswa 0%')?.[13]).toBe('Perlu Bimbingan');
    expect(findRow('Siswa 74%')?.[13]).toBe('Perlu Bimbingan');
    expect(findRow('Siswa 75%')?.[13]).toBe('Perlu Bimbingan');
    expect(findRow('Siswa 76%')?.[13]).toBe('Cukup');
    expect(findRow('Siswa 85%')?.[13]).toBe('Cukup');
    expect(findRow('Siswa 86%')?.[13]).toBe('Baik');
    expect(findRow('Siswa 95%')?.[13]).toBe('Baik');
    expect(findRow('Siswa 96%')?.[13]).toBe('Sangat Baik');
    expect(findRow('Siswa 100%')?.[13]).toBe('Sangat Baik');

    // Confirm UI and Excel row 75 match exactly
    const row75 = screen.getByText('Siswa 75%').closest('tr')!;
    expect(row75).toHaveTextContent(findRow('Siswa 75%')![13]);
  });

  it('safely handles missing KKM in shared payload without guessing or defaulting to 75', async () => {
    // When KKM is undefined/missing in payload
    mockGetSharedReportByToken.mockResolvedValue(buildReportPayload(undefined));

    render(
      <ApplicationProvider app={mockApp as any}>
        <PublicReportViewerPage token="token-public-att-123" />
      </ApplicationProvider>
    );

    expect(await screen.findByText('Siswa 75%')).toBeInTheDocument();

    // Statistics card displays '—' instead of claiming '0 Siswa'
    const criticalCard = screen.getByText('Perlu Bimbingan').closest('div')!;
    expect(criticalCard).toHaveTextContent('—');
    expect(criticalCard).not.toHaveTextContent('0 Siswa');

    // Table rows render '-' instead of making up a classification
    const row75 = screen.getByText('Siswa 75%').closest('tr')!;
    expect(row75).toHaveTextContent('-');
    expect(row75).not.toHaveTextContent('Perlu Bimbingan');

    // Excel export also has '-'
    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockAoaToSheet).toHaveBeenCalled();
    });

    const sheetData = mockAoaToSheet.mock.calls[0][0];
    const findRow = (name: string) => sheetData.find((r: any[]) => r && r[4] === name);
    expect(findRow('Siswa 75%')?.[13]).toBe('-');
  });

  it('safely handles out-of-range or non-finite KKM in payload (0, 101, NaN, Infinity) by rendering neutral output', async () => {
    for (const invalidKkm of [0, 101, NaN, Infinity]) {
      mockGetSharedReportByToken.mockResolvedValue(buildReportPayload(invalidKkm));

      const { unmount } = render(
        <ApplicationProvider app={mockApp as any}>
          <PublicReportViewerPage token="token-public-att-123" />
        </ApplicationProvider>
      );

      expect(await screen.findByText('Siswa 75%')).toBeInTheDocument();

      // Card must show '—' and NOT claim 0 or an invalid threshold
      const criticalCard = screen.getByText('Perlu Bimbingan').closest('div')!;
      expect(criticalCard).toHaveTextContent('—');
      expect(criticalCard).not.toHaveTextContent('0 Siswa');

      // Table cell renders '-'
      const row75 = screen.getByText('Siswa 75%').closest('tr')!;
      expect(row75).toHaveTextContent('-');
      expect(row75).not.toHaveTextContent('Perlu Bimbingan');

      unmount();
    }
  });

});
