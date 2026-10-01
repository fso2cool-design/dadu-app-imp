import type { UserRepository } from '../../../application/ports/userRepository';
import * as U from '../../../services/firestore/users';
export const userRepository: UserRepository = {
  getProfile: (uid) => U.getUserProfile(uid),
  createProfile: (uid,d) => U.createUserProfile(uid,d),
  updateProfile: (uid,d) => U.updateUserProfile(uid,d),
  recordLastLogin: (uid) => U.recordUserLastLogin(uid),
  updateTheme: (uid,t) => U.updateUserDesignSystemPreference(uid, t as any),
  updateDesignSystem: (uid,t) => U.updateUserDesignSystemPreference(uid, t as any),
  getAllUsers: () => U.getAllUsers(),
  setAccountStatus: (uid,s) => U.setAccountStatus(uid, s as any),
  setAccountRole: (uid,r) => U.setAccountRole(uid, r as any),
  adminUpdateProfile: (uid,d) => U.adminUpdateUserProfile(uid,d),
  getStorageStats: (uid) => U.getUserStorageStats(uid),
  purgeWorkspace: (uid) => U.purgeEntireUserWorkspace(uid),
  purgeOrphans: (uid) => U.purgeOrphanedResiduals(uid),
  scanOrphans: () => U.scanOrphanResiduals(),
};
