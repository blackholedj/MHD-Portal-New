// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Předpokládáme cestu k vaší inicializaci klienta
import { Session, User } from '@supabase/supabase-js';
import { GridLoader } from 'react-spinners';

// Definice typu pro uživatele a jeho roli (pro zjednodušení)
// V reálném projektu budete chtít načítat roli z tabulky 'profiles'
interface AuthState {
  session: Session | null;
  user: User | null;
  role: 'ghost' | 'user' | 'admin'; // Přidáváme definici role
  isLoading: boolean;
}

// Inicializace kontextu
const AuthContext = createContext<AuthState | undefined>(undefined);

// Funkce pro získání role (zatím velmi zjednodušená/statická)
// V pokročilé fázi by tato funkce četla data z tabulky 'profiles' v Supabase
const getUserRole = (user: User | null): 'ghost' | 'user' | 'admin' => {
  if (!user) {
    return 'ghost';
  }
  
  // Zde můžete implementovat logiku pro získání role z databáze
  // Pro účely nastavení: pokud je přihlášen, defaultně 'user'. 
  // Admina byste identifikoval např. podle emailu nebo databáze.
  if (user.email === 'preissler.jirik@gmail.com') { // Příklad pro admina
      return 'admin';
  }
  
  return 'user';
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'ghost' | 'user' | 'admin'>('ghost');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Získání počáteční relace a uživatele
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setRole(getUserRole(session?.user ?? null));
      setIsLoading(false);
    });

    // 2. Nastavení posluchače (listeneru) pro změny stavu autentizace
    // Toto je KLÍČOVÉ pro stabilitu! Supabase se stará o obnovování tokenu a tato funkce
    // se spustí PŘI KAŽDÉ ZMĚNĚ (přihlášení, odhlášení, vypršení tokenu, obnova).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setRole(getUserRole(session?.user ?? null));
        setIsLoading(false);
        console.log('Auth State Changed:', event);
      }
    );

    // 3. Cleanup: Odhlášení posluchače při opuštění komponenty
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    user,
    role,
    isLoading,
  };

  // Dokud se nenačte počáteční stav, můžeme zobrazit načítací obrazovku
  if (isLoading) {
    // Nahraďte toto lepším loading spinnerem!
    return <div className="p-8 text-center text-gray-500">Načítání uživatele...<br /><GridLoader color="#0066ff" /></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook pro snadné použití kontextu
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth musí být použit uvnitř AuthProvider');
  }
  return context;
};