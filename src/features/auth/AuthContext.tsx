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
import { getUserProfile, createUserProfile, recordUserLastLogin } from '../../services/firestore/users';
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

  const fetchProfile = async (firebaseUser: User) => {
    try {
      let p = await getUserProfile(firebaseUser.uid);
      if (!p) {
        // Create initial default profile if not yet created
        p = await createUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Guru',
          email: firebaseUser.email || '',
          role: 'TEACHER',
          accountStatus: 'ACTIVE',
          defaultSemester: 'GANJIL',
          isOnboarded: false,
        });
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
            recordUserLastLogin(currentUser.uid);
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
    await recordUserLastLogin(res.user.uid);
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
    const initialProfile = await createUserProfile(res.user.uid, {
      displayName: name || email.split('@')[0],
      email: res.user.email || '',
      role: 'TEACHER',
      accountStatus: 'ACTIVE',
      defaultSemester: 'GANJIL',
      isOnboarded: false,
    });
    await recordUserLastLogin(res.user.uid);
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
