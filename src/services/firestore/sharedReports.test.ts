import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedReportPayload } from '../../types';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((_db: any, collection: string, id: string) => ({ collection, id }));
const mockServerTimestamp = vi.fn(() => 'MOCK_TIMESTAMP');

vi.mock('firebase/firestore', () => ({
  doc: (db: any, collection: string, id: string) => mockDoc(db, collection, id),
  getDoc: (ref: any) => mockGetDoc(ref),
  setDoc: (ref: any, data: any) => mockSetDoc(ref, data),
  updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    fromDate: (d: Date) => ({
      toDate: () => d,
      toMillis: () => d.getTime(),
    }),
  },
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

import {
  createSharedReport,
  getSharedReportByToken,
  decryptSharedReport,
} from './sharedReports';

describe('Firestore sharedReports Service Round-Trip', () => {
  const samplePayload: SharedReportPayload = {
    reportType: 'ATTENDANCE',
    title: 'Rekap Presensi KKM 65',
    schoolName: 'MTs DADU Al-Ikhlas',
    academicYearLabel: '2026/2027',
    semester: 'GANJIL',
    className: '7-B',
    teacherName: 'Ustadz Fulan',
    generatedDate: '2026-10-16',
    attendanceData: {
      reportMode: 'SUBJECT',
      totalMeetingsOrDays: 12,
      kkm: 65,
      statistics: {
        avgPercentage: 82,
        perfectCount: 2,
        criticalCount: 1,
        totalP: 100,
        totalS: 5,
        totalI: 3,
        totalA: 2,
      },
      summaries: [
        {
          rollNumber: 1,
          nis: '1001',
          nisn: '001',
          name: 'Siswa Satu',
          gender: 'L',
          presentCount: 7,
          sickCount: 1,
          permittedCount: 0,
          absentCount: 4,
          dispensationCount: 0,
          totalMeetings: 12,
          presentPercentage: 58,
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists and retrieves attendance report payload preserving attendanceData.kkm', async () => {
    let capturedDocData: any = null;
    mockSetDoc.mockImplementation(async (_ref: any, data: any) => {
      capturedDocData = data;
    });

    // 1. Create shared report
    const created = await createSharedReport({
      userId: 'teacher-123',
      userName: 'Ustadz Fulan',
      reportType: 'ATTENDANCE',
      title: 'Rekap Presensi KKM 65',
      payload: samplePayload,
    });

    expect(created.id).toBeDefined();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(capturedDocData).not.toBeNull();
    expect(capturedDocData.payload.attendanceData.kkm).toBe(65);
    expect(capturedDocData.payload.attendanceData.statistics.criticalCount).toBe(1);

    // 2. Mock reading this exact doc back from Firestore
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: created.id,
      data: () => ({ ...capturedDocData }),
    });

    const retrieved = await getSharedReportByToken(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.payload?.attendanceData?.kkm).toBe(65);
    expect(retrieved?.payload?.attendanceData?.statistics?.criticalCount).toBe(1);
  });

  it('encrypts payload when passcode is provided and restores attendanceData.kkm on decryption', async () => {
    let capturedDocData: any = null;
    mockSetDoc.mockImplementation(async (_ref: any, data: any) => {
      capturedDocData = data;
    });

    const passcode = 'kkmPasscode123';
    const created = await createSharedReport({
      userId: 'teacher-123',
      userName: 'Ustadz Fulan',
      reportType: 'ATTENDANCE',
      title: 'Protected Report',
      passcode,
      payload: samplePayload,
    });

    // Plaintext payload is NOT stored in Firestore document
    expect(capturedDocData.payload).toBeNull();
    expect(capturedDocData.hasPasscode).toBe(true);
    expect(capturedDocData.encryptedPayload).toBeDefined();

    // Mock retrieving the protected document
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: created.id,
      data: () => ({ ...capturedDocData }),
    });

    const retrieved = await getSharedReportByToken(created.id);
    expect(retrieved?.payload).toBeNull();

    // Decrypt using correct passcode
    const decryptedPayload = await decryptSharedReport(retrieved!, passcode);
    expect(decryptedPayload.attendanceData?.kkm).toBe(65);
    expect(decryptedPayload.attendanceData?.statistics.criticalCount).toBe(1);
  });
});
