import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Profile, UserRole, Workspace } from '../lib/database.types';
import { api } from '../lib/api';

interface AuthContextType {
  user: { id: string } | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  isManager: boolean;
  isAccountingAdmin: boolean;
  isSuperAdmin: boolean;
  impersonatingWorkspace: Workspace | null;
  isImpersonating: boolean;
  canApprove: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, nameVn: string, nameJp?: string) => Promise<void>;
  signOut: () => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatingWorkspace, setImpersonatingWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedWorkspaceId = localStorage.getItem('impersonatingWorkspaceId');
    if (token) {
      api.auth.me()
        .then(p => setProfile(p))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));

      // If there's a stored workspace ID, fetch workspace info
      if (storedWorkspaceId) {
        api.workspaces.list().then(workspaces => {
          const ws = workspaces.find(w => w.id === storedWorkspaceId);
          if (ws) {
            setImpersonatingWorkspace(ws);
          } else {
            localStorage.removeItem('impersonatingWorkspaceId');
          }
        }).catch(() => {
          localStorage.removeItem('impersonatingWorkspaceId');
        });
      }
    } else {
      setLoading(false);
    }
  }, []);

  const role = profile?.role ?? null;

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { token, profile: p } = await api.auth.login(email, password);
      localStorage.setItem('token', token);
      setProfile(p);
      return {};
    } catch {
      return { error: 'Invalid credentials' };
    }
  };

  const signUp = async (email: string, password: string, nameVn: string, nameJp?: string) => {
    const { token, profile: p } = await api.auth.register({ email, password, nameVn, nameJp });
    localStorage.setItem('token', token);
    setProfile(p);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('impersonatingWorkspaceId');
    setProfile(null);
    setImpersonatingWorkspace(null);
  };

  const switchWorkspace = async (workspaceId: string) => {
    const { workspace, token } = await api.impersonate.enter(workspaceId);
    localStorage.setItem('token', token);
    localStorage.setItem('impersonatingWorkspaceId', workspaceId);
    setImpersonatingWorkspace(workspace);
    setProfile(prev => prev ? { ...prev, workspace_id: workspaceId } : null);
  };

  const exitImpersonation = async () => {
    const { token } = await api.impersonate.exit();
    localStorage.setItem('token', token);
    localStorage.removeItem('impersonatingWorkspaceId');
    setImpersonatingWorkspace(null);
    // Refetch profile to get original user data
    const p = await api.auth.me();
    setProfile(p);
  };

  const value: AuthContextType = {
    user: profile ? { id: profile.id } : null,
    profile,
    loading,
    role,
    isManager: role === 'manager',
    isAccountingAdmin: role === 'accounting_admin',
    isSuperAdmin: role === 'super_admin',
    impersonatingWorkspace,
    isImpersonating: impersonatingWorkspace !== null,
    canApprove: role === 'leader' || role === 'manager',
    signIn,
    signUp,
    signOut,
    switchWorkspace,
    exitImpersonation,
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
