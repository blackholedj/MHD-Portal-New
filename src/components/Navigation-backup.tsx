// src/components/Navigace.tsx

'use client'; 

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { BusFront, LogOut, User as UserIcon } from 'lucide-react'; // Přidáme ikony
import UserProfileModal from '@/components/common/UserProfileModal'; // <-- NOVÝ IMPORT: Modal

const Navigace = () => {
    // Rozšíření o načítání status a is_blocked pro předání do Modalu
    const { user, role, full_name, status, is_blocked, isLoading } = useAuth(); 
    const [loading, setLoading] = useState(false);
    // NOVÝ STAV: pro řízení zobrazení modálního okna
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const router = useRouter(); 

    // Logika pro zobrazení
    const isAuthenticated = user !== null;
    const isUserOrAdmin = role === 'user' || role === 'admin';
    const isAdmin = role === 'admin';

    // Logika pro zobrazení jména v navigaci
    // Použijeme full_name, jinak email (očekáváme, že full_name je lépe vypadající)
    const displayName = full_name || user?.email?.split('@')[0] || 'Uživatel';
    
    // Sestavíme data pro modal (pokud je uživatel přihlášen)
    const userDataForModal = user ? {
        email: user.email || 'N/A',
        full_name,
        role,
        status: status as ('pending' | 'approved'), // Zajištění správného typu
        is_blocked,
    } : null;

    // --- FUNKCE PRO ODHLÁŠENÍ ---
    const handleLogout = async () => {
        setLoading(true);

        const { error } = await supabase.auth.signOut();
    
        setLoading(false);

        if (error) {
            console.error("Chyba při odhlašování:", error.message);
        } else {
            router.push('/'); 
        }
    };

    return (
    <nav className="bg-white/90 backdrop-blur-md shadow-sm flex justify-between items-center z-40 sticky top-0 px-3 py-2">
      <div className="text-xl font-bold">
        <Link href="/" className="hover:text-blue-900 hover:font-bold transition duration-150">
          <span><BusFront className='container flex-col' />Dopravní Systém</span>
        </Link>
      </div>
      <div className="flex space-x-4">
        {/* Veřejné linky (pro GHOST, USER, ADMIN) */}
        <Link href="/" className="text-black hover:text-blue-900 hover:font-bold transition duration-150">Úvod</Link>
        <Link href="/maps" className="text-black hover:text-blue-900 hover:font-bold transition duration-150">Mapa linek</Link>
        <Link href="/contact" className="text-black hover:text-blue-900 hover:font-bold transition duration-150">Kontakt</Link>
        
        {/* Chráněné linky (pouze pro USER a ADMIN) */}
        {isUserOrAdmin && (
          <>
            <Link href="/user-portal/documents" className="text-black hover:text-blue-900 hover:font-bold transition duration-150">Dokumenty</Link>
            <Link href="/user-portal/tables" className="text-black hover:text-blue-900 hover:font-bold transition duration-150">Tabulky</Link>
            <Link href="/user-portal/chat" className="text-black hover:text-blue-900 hover:font-bold transition duration-150">Chat</Link>
          </>
        )}
        
        {/* Linky pouze pro ADMINA */}
        {isAdmin && (
          <Link href="/admin/dashboard" className="text-red-300 hover:text-red-500 hover:font-bold transition duration-150">ADMIN</Link>
        )}
      </div>

      <div>
        {/* Zobrazení stavu přihlášení */}
        {isAuthenticated ? (
          <div className="text-white flex items-center space-x-3">
            
                {/* KLIKATELNÉ JMÉNO, KTERÉ OTEVŘE MODAL */}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-black hover:text-yellow-500 font-semibold flex items-center p-1 rounded-md transition duration-150"
                title="Zobrazit detaily profilu"
            >
                <UserIcon className="w-5 h-5 mr-1" />
                {displayName}
            </button>
            
            <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm disabled:opacity-50 flex items-center transition duration-150"
                disabled={loading}
            >
                {loading ? 'Odpojuji...' : (
                    <>
                        <LogOut className="w-4 h-4 mr-1" />
                        Odhlásit
                    </>
                )}
            </button>
          </div>
        ) : (
          <Link href="/login" className="bg-yellow-400 text-gray-900 px-3 py-1 rounded hover:bg-yellow-500 font-medium transition duration-150">
            Přihlásit se
          </Link>
        )}
      </div>

        {/* KOMPONENTA MODALU (zobrazí se nad navigací) */}
        {userDataForModal && (
            <UserProfileModal
                userData={userDataForModal}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        )}
    </nav>
  );
};

export default Navigace;