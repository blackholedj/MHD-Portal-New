// src/app/prihlaseni/page.tsx

'use client'; 

import React, { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Import klienta Supabase
import { useAuth } from '@/context/AuthContext'; // Import našeho Auth kontextu
import { useRouter } from 'next/navigation'; // Pro přesměrování
import { GridLoader } from 'react-spinners';

const PrihlaseniPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Získání stavu uživatele z kontextu
  const { user, isLoading: isAuthLoading } = useAuth(); 
  const router = useRouter();

  // Efekt pro přesměrování již přihlášených uživatelů
  useEffect(() => {
    // Pokud je uživatel přihlášen a kontext je načtený, přesměrujeme ho na jeho portál
    if (!isAuthLoading && user) {
      router.push('/user-portal/tables'); 
    }
  }, [user, isAuthLoading, router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Volání metody Supabase pro přihlášení
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      // Zobrazení chyby z Supabase (např. "Invalid login credentials")
      setError(error.message);
    } 
    // Při úspěšném přihlášení se automaticky spustí 'onAuthStateChange' v AuthContextu,
    // aktualizuje stav a useEffect nahoře uživatele přesměruje.
  };
  
  // Zobrazení načítací obrazovky během ověřování stavu v AuthContextu
  if (isAuthLoading || user) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <p className="text-lg text-gray-600">Ověřování přihlášení a přesměrování...</p>
            <GridLoader color="#0066ff" />
        </div>
    );
  }

  // --- HTML formulář ---
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Přihlášení do MHD Portálu</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="ridic@mhd-firma.cz"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Heslo
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="********"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            >
              {loading ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
            <a 
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 cursor-pointer"
              onClick={() => alert('Zatím není implementováno. Obraťte se na administrátora.')} 
            >
              Zapomněli jste heslo?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrihlaseniPage;