import { describe, expect, it } from 'vitest';
import { getMeetingSlotId, isValidMeetingNumber } from './meetingPolicy';

describe('meetingPolicy — getMeetingSlotId()', () => {
  it('generates exact canonical slot ID for representative alphanumeric assignment IDs', () => {
    expect(getMeetingSlotId('ta-1', 'GANJIL', 1)).toBe('slot_ta-1_GANJIL_1');
    expect(getMeetingSlotId('ta_2026_xyz', 'GANJIL', 4)).toBe('slot_ta_2026_xyz_GANJIL_4');
    expect(getMeetingSlotId('assignment-abc-123', 'GENAP', 10)).toBe('slot_assignment-abc-123_GENAP_10');
  });

  it('supports both GANJIL and GENAP semesters with diverse meeting numbers', () => {
    expect(getMeetingSlotId('ta-math', 'GANJIL', 1)).toBe('slot_ta-math_GANJIL_1');
    expect(getMeetingSlotId('ta-math', 'GENAP', 1)).toBe('slot_ta-math_GENAP_1');
    expect(getMeetingSlotId('ta-math', 'GENAP', 16)).toBe('slot_ta-math_GENAP_16');
  });

  it('preserves existing sanitization behavior replacing non-alphanumeric/dash/underscore chars with _', () => {
    // Slashes, dots, at-signs, spaces, and punctuation
    expect(getMeetingSlotId('ta/special', 'GENAP', 12)).toBe('slot_ta_special_GENAP_12');
    expect(getMeetingSlotId('ta.abc@class', 'GANJIL', 2)).toBe('slot_ta_abc_class_GANJIL_2');
    expect(getMeetingSlotId('ta#1$2%3', 'GANJIL', 3)).toBe('slot_ta_1_2_3_GANJIL_3');
  });

  it('matches Firestore Security Rules concatenated slot path contract for standard IDs', () => {
    // In firestore.rules: 'slot_' + taId + '_' + semester + '_' + string(meetingNumber)
    const standardTaId = 'assignment-2026-xyz';
    const semester = 'GANJIL';
    const meetingNumber = 5;

    const domainSlotId = getMeetingSlotId(standardTaId, semester, meetingNumber);
    const expectedRulePath = `slot_${standardTaId}_${semester}_${meetingNumber}`;

    expect(domainSlotId).toBe(expectedRulePath);
  });
});

describe('meetingPolicy — isValidMeetingNumber()', () => {
  it('returns true for positive integers >= 1', () => {
    expect(isValidMeetingNumber(1)).toBe(true);
    expect(isValidMeetingNumber(2)).toBe(true);
    expect(isValidMeetingNumber(10)).toBe(true);
    expect(isValidMeetingNumber(100)).toBe(true);
  });

  it('rejects 0', () => {
    expect(isValidMeetingNumber(0)).toBe(false);
  });

  it('rejects negative integers', () => {
    expect(isValidMeetingNumber(-1)).toBe(false);
    expect(isValidMeetingNumber(-2)).toBe(false);
    expect(isValidMeetingNumber(-100)).toBe(false);
  });

  it('rejects decimal fractions', () => {
    expect(isValidMeetingNumber(1.1)).toBe(false);
    expect(isValidMeetingNumber(1.5)).toBe(false);
    expect(isValidMeetingNumber(0.99)).toBe(false);
    expect(isValidMeetingNumber(-0.5)).toBe(false);
  });

  it('rejects NaN and positive / negative Infinity', () => {
    expect(isValidMeetingNumber(NaN)).toBe(false);
    expect(isValidMeetingNumber(Infinity)).toBe(false);
    expect(isValidMeetingNumber(-Infinity)).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidMeetingNumber(null)).toBe(false);
    expect(isValidMeetingNumber(undefined)).toBe(false);
  });

  it('rejects strings passed directly without prior Number(...) normalization', () => {
    expect(isValidMeetingNumber('1')).toBe(false);
    expect(isValidMeetingNumber(' 1 ')).toBe(false);
    expect(isValidMeetingNumber('0')).toBe(false);
    expect(isValidMeetingNumber('-1')).toBe(false);
    expect(isValidMeetingNumber('1.5')).toBe(false);
    expect(isValidMeetingNumber('')).toBe(false);
    expect(isValidMeetingNumber('   ')).toBe(false);
    expect(isValidMeetingNumber('abc')).toBe(false);
  });

  it('rejects non-number primitive types and complex objects', () => {
    expect(isValidMeetingNumber(true)).toBe(false);
    expect(isValidMeetingNumber(false)).toBe(false);
    expect(isValidMeetingNumber({})).toBe(false);
    expect(isValidMeetingNumber([])).toBe(false);
    expect(isValidMeetingNumber(Symbol('sym'))).toBe(false);
    expect(isValidMeetingNumber(() => 1)).toBe(false);
  });
});
