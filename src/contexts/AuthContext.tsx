import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../lib/database.types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  isManager: boolean;
  isAccountingAdmin: boolean;
  canApprove: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    meta: { name_vn: string; name_jp: string; role: UserRole }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          (async () => {
            await loadProfile(session.user.id);
          })();
        } else {
          setProfile(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    meta: { name_vn: string; name_jp: string; role: UserRole }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role = profile?.role ?? null;
  const isManager = role === 'manager';
  const isAccountingAdmin = role === 'accounting_admin';
  const canApprove = role === 'leader' || role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        role,
        isManager,
        isAccountingAdmin,
        canApprove,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
