import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock firestore methods
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

import { createUserProfile, getUserProfile, updateUserProfile } from './users';

describe('Firestore Users Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('returns user profile data when document exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'user-123',
        data: () => ({
          displayName: 'Pak Guru',
          email: 'guru@sekolah.sch.id',
          role: 'TEACHER',
        }),
      });

      const profile = await getUserProfile('user-123');

      expect(mockDoc).toHaveBeenCalledWith({ type: 'firestore' }, 'users', 'user-123');
      expect(profile).toEqual({
        uid: 'user-123',
        displayName: 'Pak Guru',
        email: 'guru@sekolah.sch.id',
        role: 'TEACHER',
      });
    });

    it('returns null when document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const profile = await getUserProfile('non-existent');
      expect(profile).toBeNull();
    });
  });

  describe('createUserProfile', () => {
    it('creates standard TEACHER profile for normal email', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const profile = await createUserProfile('user-456', {
        displayName: 'Guru Baru',
        email: 'gurubaru@sekolah.sch.id',
      });

      expect(profile.role).toBe('TEACHER');
      expect(profile.uid).toBe('user-456');
      expect(profile.accountStatus).toBe('ACTIVE');
      expect(profile.createdAt).toBe('MOCK_TIMESTAMP');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    it('automatically grants ADMIN role for configured super admin emails', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const profile = await createUserProfile('admin-789', {
        displayName: 'Super Admin',
        email: 'johanrovian90@gmail.com',
      });

      expect(profile.role).toBe('ADMIN');
      expect(profile.uid).toBe('admin-789');
    });
  });

  describe('updateUserProfile', () => {
    it('updates profile but strips role changes to prevent privilege escalation', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateUserProfile('user-456', {
        displayName: 'Nama Diperbarui',
        phone: '08123456789',
        // Attempting to escalate role
        role: 'ADMIN',
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ role: 'ADMIN' })
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          displayName: 'Nama Diperbarui',
          phone: '08123456789',
          updatedAt: 'MOCK_TIMESTAMP',
        })
      );
    });
  });
});
