import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  getIdTokenResult,
  User as FirebaseAuthUser
} from 'firebase/auth';
import { auth } from '../../services/firebase/config';
import type { AdminClaimVerificationResult } from '../../application/types';

export const authRepository = {
  login: async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  },
  signup: async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) {
      await updateFirebaseProfile(res.user, { displayName: name });
    }
    return res.user;
  },
  logout: async () => {
    await signOut(auth);
  },
  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },
  onAuthStateChanged: (callback: (user: FirebaseAuthUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },
  getAdminClaimStatus: async (forceRefresh = false): Promise<AdminClaimVerificationResult> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { status: 'not-admin' };
    }
    try {
      const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
      if (tokenResult?.claims?.admin === true) {
        return { status: 'verified-admin' };
      }
      return { status: 'not-admin' };
    } catch (err: any) {
      return {
        status: 'verification-error',
        error: err?.message || 'Gagal memverifikasi klaim token.',
      };
    }
  },
};
