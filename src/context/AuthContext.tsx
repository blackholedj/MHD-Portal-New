'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';

import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type Role = 'ghost' | 'user' | 'admin';

export type ProfileStatus =
  | 'pending'
  | 'approved'
  | 'blocked'
  | 'rejected';

interface ProfileData {
  role: Role;
  full_name: string | null;
  status: ProfileStatus;
  is_blocked: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  full_name: string | null;
  role: Role;
  isLoading: boolean;
  status: ProfileStatus;
  is_blocked: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const defaultProfile: ProfileData = {
  role: 'ghost',
  full_name: null,
  status: 'pending',
  is_blocked: false,
};

async function fetchUserProfileData(user: User | null): Promise<ProfileData> {
  if (!user) {
    return { ...defaultProfile };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, full_name, status, is_blocked')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      console.error('Profile authorization failed:', error?.message);
      return { ...defaultProfile };
    }

    const status: ProfileStatus =
      data.status === 'approved' ||
      data.status === 'pending' ||
      data.status === 'blocked' ||
      data.status === 'rejected'
        ? data.status
        : 'pending';

    const isBlocked = data.is_blocked !== false;

    const allowed = status === 'approved' && !isBlocked;

    const role: Role = !allowed
      ? 'ghost'
      : data.role === 'admin'
        ? 'admin'
        : data.role === 'user'
          ? 'user'
          : 'ghost';

    return {
      role,
      full_name: data.full_name,
      status,
      is_blocked: isBlocked,
    };
  } catch (error) {
    console.error('Profile lookup failed:', error);
    return { ...defaultProfile };
  }
}

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [full_name, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('ghost');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<ProfileStatus>('pending');
  const [is_blocked, setIsBlocked] = useState(false);

  const requestIdRef = useRef(0);
  const sessionIdentityRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    const applySession = (nextSession: Session | null) => {
      const requestId = ++requestIdRef.current;
      const nextUser = nextSession?.user ?? null;

      // Focus and token-refresh events for the same identity must not unmount
      // active editors. Authorization is still refreshed by the profile query.
      const nextIdentity = nextUser?.id ?? null;
      const identityChanged = sessionIdentityRef.current !== nextIdentity;
      sessionIdentityRef.current = nextIdentity;
      if (identityChanged) {
        setIsLoading(true);
        setRole('ghost');
        setStatus('pending');
        setIsBlocked(false);
        setFullName(null);
      }
      setSession(nextSession);
      // Supabase emits equivalent user snapshots on focus; keep references stable
      // so data effects do not reload every open editor unnecessarily.
      setUser(previous => JSON.stringify(previous) === JSON.stringify(nextUser) ? previous : nextUser);

      // Do not await profile queries inside onAuthStateChange.
      void fetchUserProfileData(nextUser).then((profile) => {
        if (!active || requestId !== requestIdRef.current) {
          return;
        }

        setRole(profile.role);
        setFullName(profile.full_name);
        setStatus(profile.status);
        setIsBlocked(profile.is_blocked);
        setIsLoading(false);
      });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      if (active) {
        applySession(nextSession);
      }
    });

    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!active || receivedAuthEvent) return;

        if (error) {
          console.error('Session initialization failed:', error.message);
        }

        applySession(error ? null : data.session);
      },
      (error) => {
        if (!active || receivedAuthEvent) return;
        console.error('Session initialization failed:', error);
        applySession(null);
      }
    );

    return () => {
      active = false;
      requestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    user,
    full_name,
    role,
    status,
    is_blocked,
    isLoading,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-xl text-gray-500">
          Načítání uživatelského profilu...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth musí být použit uvnitř AuthProvider');
  }

  return context;
};
