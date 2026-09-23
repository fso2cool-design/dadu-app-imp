import { describe, expect, it } from 'vitest';
import { SharedReportPayload } from '../types';
import { decryptReportPayload, encryptReportPayload } from './reportCrypto';

describe('Report Crypto Utilities (AES-GCM 256 + PBKDF2)', () => {
  const mockPayload: SharedReportPayload = {
    reportType: 'LEGGER',
    title: 'Laporan Capaian Pembelajaran',
    schoolName: 'MTs Dadu Cendekia',
    academicYearLabel: '2026/2027',
    semester: 'GANJIL',
    className: 'Kelas 9A',
    teacherName: 'Ahmad Dahlan, S.Pd.I.',
    generatedDate: '2026-09-23T10:00:00Z',
    leggerData: {
      kkm: 75,
      subjects: [{ id: 'mat', name: 'Matematika' }],
      rows: [
        {
          rollNumber: 1,
          nis: '1001',
          nisn: '0012345678',
          name: 'Fulan bin Fulan',
          gender: 'L',
          subjectScores: { mat: 90 },
          totalScore: 90,
          averageScore: 90,
          rank: 1,
        },
      ],
      classAverage: 90,
    },
  };

  it('successfully encrypts and decrypts a payload with the correct passcode', async () => {
    const passcode = 'rahasia123';
    const encrypted = await encryptReportPayload(mockPayload, passcode);

    expect(encrypted.encryptedPayload).toBeDefined();
    expect(typeof encrypted.encryptedPayload).toBe('string');
    expect(encrypted.salt).toHaveLength(32); // 16 bytes hex = 32 chars
    expect(encrypted.iv).toHaveLength(24); // 12 bytes hex = 24 chars

    const decrypted = await decryptReportPayload(
      encrypted.encryptedPayload,
      encrypted.salt,
      encrypted.iv,
      passcode
    );

    expect(decrypted).toEqual(mockPayload);
  });

  it('fails decryption when provided with the wrong passcode', async () => {
    const passcode = 'rahasia123';
    const wrongPasscode = 'salah123';
    const encrypted = await encryptReportPayload(mockPayload, passcode);

    await expect(
      decryptReportPayload(
        encrypted.encryptedPayload,
        encrypted.salt,
        encrypted.iv,
        wrongPasscode
      )
    ).rejects.toThrow();
  });
});
