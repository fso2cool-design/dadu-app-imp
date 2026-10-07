import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  User as FirebaseAuthUser
} from 'firebase/auth';
import { auth } from '../../services/firebase/config';

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
  }
};
