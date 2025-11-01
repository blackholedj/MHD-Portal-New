// src/components/Navigace.tsx

'use client'; // Next.js v App Routeru vyžaduje 'use client' pro interaktivní komponenty

import React from 'react';
import { useAuth } from '@/context/AuthContext'; // Import hooku
import Link from 'next/link';

const Navigace = () => {
  const { user, role, isLoading } = useAuth(); // Získání stavu z kontextu

  // Můžeme se rozhodnout, co zobrazit na základě role
  const isUserOrAdmin = role === 'user' || role === 'admin';
  const isAdmin = role === 'admin';

// Nová funkce pro odhlášení
  const handleLogout = async () => {
    // Volání odhlášení Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Chyba při odhlašování:", error.message);
        // Zde by mohlo být zobrazeno upozornění uživateli
    }
    // AuthContext automaticky zachytí změnu stavu a aktualizuje UI
    // Můžete přidat i přesměrování na úvodní stránku
    router.push('/'); 
  };

  return (
    <nav className="bg-mhd-modra p-4 shadow-lg flex justify-between items-center">
      <div className="flex space-x-4">
        {/* Veřejné linky (pro GHOST, USER, ADMIN) */}
        <Link href="/" className="text-white hover:text-yellow-300">Úvod</Link>
        <Link href="/maps" className="text-white hover:text-yellow-300">Mapa</Link>
        <Link href="/contact" className="text-white hover:text-yellow-300">Kontakt</Link>
        
        {/* Chráněné linky (pouze pro USER a ADMIN) */}
        {isUserOrAdmin && (
          <>
            <Link href="/user-portal/documents" className="text-white hover:text-yellow-300">Dokumenty</Link>
            <Link href="/user-portal/tables" className="text-white hover:text-yellow-300">Tabulky</Link>
            <Link href="/user-portal/chat" className="text-white hover:text-yellow-300">Chat</Link>
          </>
        )}
        
        {/* Linky pouze pro ADMINA (např. správa uživatelů) */}
        {isAdmin && (
          <Link href="/admin/dashboard" className="text-red-300 hover:text-red-500 font-bold">ADMIN</Link>
        )}
      </div>

<div>
        {/* Zobrazení stavu přihlášení */}
        {user ? (
          <div className="text-white flex items-center space-x-3">
            <span className="text-sm">Vítejte, **{user.email}** ({role})</span>
            <button
                onClick={handleLogout} // Volání odhlašovací funkce
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                disabled={loading}
            >
                Odhlásit
            </button>
          </div>
        ) : (
          <Link href="/prihlaseni" className="bg-yellow-400 text-gray-900 px-3 py-1 rounded hover:bg-yellow-500 font-medium">
            Přihlásit se
          </Link>
        )}
      </div>
/
    </nav>
  );
};

export default Navigace;