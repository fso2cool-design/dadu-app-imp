import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth } from '../../services/firebase/config';
import { useApplication } from '../../application/ApplicationContext';
import { UserProfile } from '../../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const app = useApplication();

  const fetchProfile = async (firebaseUser: User) => {
    try {
      let p: UserProfile | null = null;
      try {
        p = await app.auth.getProfile(firebaseUser.uid);
      } catch (getErr: any) {
        const code = getErr?.code || '';
        const msg = (getErr?.message || '').toLowerCase();
        const isOffline = code === 'unavailable' || msg.includes('offline') || msg.includes('failed to get document because the client is offline');
        if (isOffline) {
          console.warn('[Auth] getProfile offline — keep existing profile, skip create');
          return;
        }
        throw getErr;
      }
      if (!p) {
        // Double-check: doc may have been created between get and create — createProfile now guards with exists check
        p = await app.auth.createProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Guru',
          email: firebaseUser.email || '',
          role: 'TEACHER',
          accountStatus: 'ACTIVE',
          defaultSemester: 'GANJIL',
          isOnboarded: false,
        });
      } else if ((p as any).isOnboarded === undefined) {
        // Legacy doc without isOnboarded — treat as onboarded if subcollections exist, do not force wizard
        p.isOnboarded = true;
      }
      setProfile(p);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Record last login once per browser session/device
        try {
          if (sessionStorage.getItem('login_session_recorded') !== currentUser.uid) {
            app.auth.recordLastLogin(currentUser.uid);
            sessionStorage.setItem('login_session_recorded', currentUser.uid);
          }
        } catch {}
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    await app.auth.recordLastLogin(res.user.uid);
    try {
      sessionStorage.setItem('login_session_recorded', res.user.uid);
    } catch {}
    await fetchProfile(res.user);
  };

  const signup = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) {
      await updateFirebaseProfile(res.user, { displayName: name });
    }
    const initialProfile = await app.auth.createProfile(res.user.uid, {
      displayName: name || email.split('@')[0],
      email: res.user.email || '',
      role: 'TEACHER',
      accountStatus: 'ACTIVE',
      defaultSemester: 'GANJIL',
      isOnboarded: false,
    });
    await app.auth.recordLastLogin(res.user.uid);
    try {
      sessionStorage.setItem('login_session_recorded', res.user.uid);
    } catch {}
    setProfile(initialProfile);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      try {
        sessionStorage.clear();
      } catch (e) {
        // ignore
      }
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
