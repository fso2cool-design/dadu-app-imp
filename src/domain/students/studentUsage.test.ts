import { describe, it, expect } from 'vitest';
import { deriveStudentUsage } from './studentUsage';
describe('studentUsage', () => {
  it('unused => canDelete', () => { const r = deriveStudentUsage({ enrollments: 0, scores: 0, attendanceRecords: 0, dailyAttendanceRecords: 0, studentNotes: 0 }); expect(r.canDelete).toBe(true); expect(r.isUsed).toBe(false); });
  it('used when enrollment', () => { const r = deriveStudentUsage({ enrollments: 1, scores: 0, attendanceRecords: 0, dailyAttendanceRecords: 0, studentNotes: 0 }); expect(r.isUsed).toBe(true); expect(r.reasons[0]).toMatch(/rombongan/); });
  it('multiple reasons', () => { const r = deriveStudentUsage({ enrollments: 1, scores: 2, attendanceRecords: 0, dailyAttendanceRecords: 1, studentNotes: 0 }); expect(r.reasons.length).toBe(3); });
});
