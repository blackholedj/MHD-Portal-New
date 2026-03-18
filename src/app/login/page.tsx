// src/app/prihlaseni/page.tsx

'use client'; 

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
// import { GridLoader } from 'react-spinners'; // Komentováno, pokud GridLoader způsobuje problém s chybějícím importem

const PrihlaseniPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoading: isAuthLoading } = useAuth(); 
  const router = useRouter();

  // Efekt pro přesměrování již přihlášených uživatelů (Zůstává stejný)
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push('/user-portal/tabulky'); // Zkontrolujte cestu, pokud jste použil /tables
    }
  }, [user, isAuthLoading, router]);

  // --- NOVÁ FUNKCE PRO PŘIHLÁŠENÍ PŘES GOOGLE ---
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Důležité: Tím se Supabase přesměruje zpět na vaši aplikaci po přihlášení
        redirectTo: window.location.origin + '/auth/callback', 
        // Volitelně: Můžete přidat 'access_type: 'offline'' pro získání refresh tokenu
      },
    });

    if (error) {
      setError(`Chyba při přihlašování přes Google: ${error.message}`);
      setLoading(false);
    }
    // Při úspěchu Supabase automaticky přesměruje uživatele na Google přihlašovací stránku.
    // Není potřeba ručně nastavovat loading na false, protože uživatel opustí stránku.
  };

  // Zobrazení načítací obrazovky během ověřování stavu v AuthContextu (Zůstává stejný)
  if (isAuthLoading || user) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <p className="text-lg text-gray-600">Ověřování přihlášení a přesměrování...</p>
            {/* GridLoader color="#0066ff" -- Odkomentujte, pokud máte instalovaný balíček react-spinners */}
        </div>
    );
  }

  // --- NOVÉ JSX PRO PŘIHLÁŠENÍ PŘES GOOGLE ---
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Přihlášení do MHD Portálu</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg shadow-sm hover:shadow-md transition disabled:opacity-50"
            >
              {/* Ikona Google (můžete nahradit skutečnou SVG ikonou) */}
              <span className="text-xl mr-3">G</span> 
              {loading ? 'Přesměrování...' : 'Přihlásit se pomocí Google'}
            </button>
            
            <p className="text-center text-sm text-gray-500 pt-2">
                Přihlášení je dostupné pouze pro autorizované účty.
            </p>
        </div>

      </div>
    </div>
  );
};

export default PrihlaseniPage;