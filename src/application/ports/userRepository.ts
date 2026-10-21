import type { UserProfile, UserRole, AccountStatus, AppearancePresetKey } from '../../types';
import type { UserStorageStats, OrphanResidualItem } from '../../domain/user.types';

export interface UserRepository {
  getProfile(uid: string): Promise<UserProfile | null>;
  createProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile>;
  updateProfile(uid: string, data: Partial<UserProfile>): Promise<void>;
  recordLastLogin(uid: string): Promise<void>;
  updateAppearancePresetPreference(uid: string, preset: AppearancePresetKey): Promise<void>;
  getAllUsers(): Promise<UserProfile[]>;
  setAccountStatus(uid: string, status: AccountStatus): Promise<void>;
  setAccountRole(uid: string, role: UserRole): Promise<void>;
  adminUpdateProfile(targetUid: string, data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  getStorageStats(targetUid: string): Promise<UserStorageStats>;
  purgeWorkspace(targetUid: string): Promise<number>;
  purgeOrphans(targetUid: string): Promise<number>;
  scanOrphans(): Promise<OrphanResidualItem[]>;
}
