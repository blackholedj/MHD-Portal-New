// src/context/AuthContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// --- TYPY ---
export type Role = 'ghost' | 'user' | 'admin'; 

// Definice struktury dat, která se stáhnou z tabulky 'profiles'
interface ProfileData {
  role: Role;
  full_name: string | null;
  status: 'pending' | 'approved';
  is_blocked: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  full_name: string | null;
  role: Role; 
  isLoading: boolean;
  status: 'pending' | 'approved';
  is_blocked: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// --- ASYNCHRONNÍ FUNKCE PRO ZÍSKÁNÍ ROLE A JMÉNA Z DATABÁZE ---
// Tato funkce nyní vrací obě hodnoty.
const fetchUserProfileData = async (user: User | null): Promise<ProfileData> => {
  // 1. Nepřihlášený uživatel
  if (!user) {
    return { role: 'ghost', full_name: null, status: 'pending', is_blocked: false };
  }
  
  // 2. Získání role A jména z tabulky 'profiles'
  const { data, error } = await supabase
    .from('profiles')
    // POZOR ZDE: Změna selectu, aby stahoval obě hodnoty
    .select('role, full_name, status, is_blocked, email') 
    .eq('id', user.id)
    .single();
  //console.log('Fetched profile data:', data, 'Error:', error);
  if (error || !data) {
    console.error('Chyba při získávání dat profilu z databáze:', error?.message);
    // Bezpečný fallback: defaultní role a prázdné jméno
    return { role: 'user' , full_name: user.email?.split('@')[0] ?? null, status: 'pending', is_blocked: false  };
  }

  // 3. Kontrola a vrácení dat
  const userRole = data.role as Role; 
  const fullName = data.full_name;
  const status = data.status;
  const isBlocked = data.is_blocked;

  return { 
    // Zajištění, že role je vždy 'user' nebo 'admin' (nebo fallback)
    role: (userRole === 'admin') ? 'admin' : 'user', 
    full_name: fullName,
    status,
    is_blocked: isBlocked,
  };
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [full_name, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('ghost');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'approved'>('pending');
  const [is_blocked, setIsBlocked] = useState<boolean>(false);

  // Funkce, která provede celou logiku načítání a aktualizace stavu
  const handleAuthStateChange = useCallback(async (currentSession: Session | null) => {
    const currentUser = currentSession?.user ?? null;
    
    setSession(currentSession);
    setUser(currentUser);

    // Asynchronní volání pro získání role A jména
    const profileData = await fetchUserProfileData(currentUser);
    
    setRole(profileData.role);
    setFullName(profileData.full_name); // <-- AKTUALIZACE JMENA
    setStatus(profileData.status);
    setIsBlocked(profileData.is_blocked);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Inicializace a posluchač (zůstává stejné)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth State Changed:', event);
        handleAuthStateChange(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange]); 
  //console.log('AuthContext State:', { session, user, role, full_name, status, is_blocked, isLoading });
  const value: AuthState = {
    session,
    user,
    full_name, // <-- EXPORTOVÁNÍ JMENA
    role,
    status,
    is_blocked,
    isLoading,
  };

  // Dokud se nenačte počáteční stav (včetně role a jména), zobrazíme loading
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50"><p className="text-xl text-gray-500">Načítání uživatelského profilu...</p></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook (zůstává stejný)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth musí být použit uvnitř AuthProvider');
  }
  return context;
};