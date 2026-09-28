import { describe, it, expect } from 'vitest';
import { checkNisnAvailabilityPure, normalizeNisn, canArchiveStudent, isValidStudentName } from './studentPolicy';
describe('studentPolicy', () => {
  it('empty nisn available', () => { expect(checkNisnAvailabilityPure({ nisn: '', students: [] }).isAvailable).toBe(true); });
  it('conflict active', () => { const r = checkNisnAvailabilityPure({ nisn: '1234567890', students: [{ id: 'a', nisn: '1234567890', fullName: 'Ahmad' }] }); expect(r.isAvailable).toBe(false); expect(r.conflictingStudentId).toBe('a'); });
  it('archived ignore', () => { expect(checkNisnAvailabilityPure({ nisn: '123', students: [{ id: 'a', nisn: '123', isArchived: true }] }).isAvailable).toBe(true); });
  it('exclude self', () => { expect(checkNisnAvailabilityPure({ nisn: '123', students: [{ id: 'a', nisn: '123' }], excludeStudentId: 'a' }).isAvailable).toBe(true); });
  it('normalize', () => expect(normalizeNisn(' 123 ')).toBe('123'));
  it('canArchive', () => { expect(canArchiveStudent('GRADUATED')).toBe(true); expect(canArchiveStudent('ACTIVE')).toBe(false); });
  it('valid name', () => { expect(isValidStudentName('A')).toBe(false); expect(isValidStudentName('Ali')).toBe(true); });
});
