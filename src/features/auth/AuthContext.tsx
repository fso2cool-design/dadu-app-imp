import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
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

  const fetchProfile = React.useCallback(async (firebaseUser: User) => {
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
  }, [app]);

  useEffect(() => {
    const unsubscribe = app.auth.onAuthStateChanged(async (currentUser) => {
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
  }, [app, fetchProfile]);

  const login = React.useCallback(async (email: string, pass: string) => {
    const resUser = await app.auth.login(email, pass);
    await app.auth.recordLastLogin(resUser.uid);
    try {
      sessionStorage.setItem('login_session_recorded', resUser.uid);
    } catch {}
    await fetchProfile(resUser);
  }, [app, fetchProfile]);

  const signup = React.useCallback(async (email: string, pass: string, name: string) => {
    const resUser = await app.auth.signup(email, pass, name);
    const initialProfile = await app.auth.createProfile(resUser.uid, {
      displayName: name || email.split('@')[0],
      email: resUser.email || '',
      role: 'TEACHER',
      accountStatus: 'ACTIVE',
      defaultSemester: 'GANJIL',
      isOnboarded: false,
    });
    await app.auth.recordLastLogin(resUser.uid);
    try {
      sessionStorage.setItem('login_session_recorded', resUser.uid);
    } catch {}
    setProfile(initialProfile);
  }, [app]);

  const logout = React.useCallback(async () => {
    try {
      await app.auth.logout();
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
  }, [app]);

  const resetPassword = React.useCallback(async (email: string) => {
    await app.auth.resetPassword(email);
  }, [app]);

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  const contextValue = React.useMemo(() => ({
    user,
    profile,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    refreshProfile,
  }), [user, profile, loading, login, signup, logout, resetPassword, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
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
