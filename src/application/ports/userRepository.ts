import type { UserProfile } from '../../types';
export interface UserRepository {
  getProfile(uid: string): Promise<UserProfile | null>;
  createProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile>;
  updateProfile(uid: string, data: Partial<UserProfile>): Promise<void>;
  recordLastLogin(uid: string): Promise<void>;
  updateTheme(uid: string, theme: string): Promise<void>;
  getAllUsers(): Promise<UserProfile[]>;
  setAccountStatus(uid: string, status: string): Promise<void>;
  setAccountRole(uid: string, role: string): Promise<void>;
  adminUpdateProfile(targetUid: string, data: any): Promise<void>;
  getStorageStats(targetUid: string): Promise<any>;
  purgeWorkspace(targetUid: string): Promise<number>;
  purgeOrphans(targetUid: string): Promise<number>;
  scanOrphans(): Promise<any[]>;
}
