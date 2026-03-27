import { createContext, useContext, ReactNode } from 'react';
import type { Profile, UserRole } from '../lib/database.types';
import { MOCK_PROFILE } from '../lib/mock-data';

interface AuthContextType {
  user: { id: string } | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  isManager: boolean;
  isAccountingAdmin: boolean;
  canApprove: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const profile = MOCK_PROFILE;
  const role = profile.role;

  const value: AuthContextType = {
    user: { id: profile.id },
    profile,
    loading: false,
    role,
    isManager: role === 'manager',
    isAccountingAdmin: role === 'accounting_admin',
    canApprove: role === 'leader' || role === 'manager',
    signOut: () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
