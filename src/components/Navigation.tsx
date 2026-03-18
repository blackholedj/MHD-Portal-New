// src/components/Navigace.tsx

'use client'; 

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'; // Přidán usePathname
import { supabase } from '@/lib/supabase/client';
// Importujeme ikony pro navigaci, uživatele a hamburger menu
import { BusFront, Loader2 , LogOut, User as UserIcon, Menu, X } from 'lucide-react'; 
import UserProfileModal from '@/components/common/UserProfileModal'; 

const Navigace = () => {
    const { user, role, full_name, status, is_blocked, isLoading } = useAuth(); 
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); 
    // NOVÝ STAV: pro řízení mobilního menu
    const [isMenuOpen, setIsMenuOpen] = useState(false); 
    const router = useRouter(); 
    const pathname = usePathname(); // Získáme aktuální cestu

    // Logika pro zobrazení
    const isAuthenticated = user !== null;
    const isUserOrAdmin = role === 'user' || role === 'admin';
    const isAdmin = role === 'admin';

    // Logika pro zobrazení jména v navigaci
    const displayName = full_name || user?.email?.split('@')[0] || 'Uživatel';
    
    // Data pro modal
    const userDataForModal = user ? {
        email: user.email || 'N/A',
        full_name,
        role,
        status: status as ('pending' | 'approved'),
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
            // Zavřeme modal i menu před přesměrováním
            setIsModalOpen(false);
            setIsMenuOpen(false); 
            router.push('/'); 
        }
    };

    // Funkce pro určení třídy odkazu
    const getLinkClass = (href: string, baseClasses: string = 'text-gray-700 hover:text-blue-600') => {
        const isActive = pathname === href;
        return `${baseClasses} transition duration-150 ${isActive ? 'text-blue-600 font-bold border-b-2 border-blue-600' : ''}`;
    };

    // --- Seznam odkazů ---
    const navLinks = (
        <>
            <Link href="/" className={getLinkClass('/', 'text-black hover:text-blue-600')}>Úvod</Link>
            <Link href="/maps" className={getLinkClass('/maps', 'text-black hover:text-blue-600')}>Mapa linek</Link>
            <Link href="/contact" className={getLinkClass('/contact', 'text-black hover:text-blue-600')}>Kontakt</Link>
            
            {isUserOrAdmin && (
            <>
                <Link href="/user-portal/documents" className={getLinkClass('/user-portal/documents', 'text-black hover:text-blue-600')}>Dokumenty</Link>
                <Link href="/user-portal/tables" className={getLinkClass('/user-portal/tables', 'text-black hover:text-blue-600')}>Tabulky</Link>
                <Link href="/user-portal/chat" className={getLinkClass('/user-portal/chat', 'text-black hover:text-blue-600')}>Chat</Link>
            </>
            )}
            
            {isAdmin && (
                <Link href="/admin/dashboard" className="text-red-500 hover:text-red-700 font-bold transition duration-150">ADMIN</Link>
            )}
        </>
    );
    
    // --- Akce přihlášení/profilu ---
    const authActions = (
        <div>
            {isAuthenticated ? (
                <div className="text-black flex items-center space-x-3">
                    {/* KLIKATELNÉ JMÉNO / PROFIL */}
                    <button 
                        onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }}
                        className="text-gray-700 hover:text-blue-600 font-semibold flex items-center p-1 rounded-md transition duration-150"
                        title="Zobrazit detaily profilu"
                    >
                        <UserIcon className="w-5 h-5 mr-1" />
                        <span className="hidden sm:inline">{displayName}</span>
                    </button>
                    
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm disabled:opacity-50 flex items-center transition duration-150"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogOut className="w-4 h-4 mr-1" />}
                        <span className="hidden sm:inline">{loading ? 'Odpojuji...' : 'Odhlásit'}</span>
                        <span className="sm:hidden">{loading ? '...' : 'Odhlásit'}</span>
                    </button>
                </div>
            ) : (
                <Link href="/login" className="bg-yellow-400 text-gray-900 px-3 py-2 rounded hover:bg-yellow-500 font-medium transition duration-150" onClick={() => setIsMenuOpen(false)}>
                    Přihlásit
                </Link>
            )}
        </div>
    );


    return (
    <nav 
        // Použijeme tvůj upravený styl pro bílou s mírným stínem
        className="bg-white p-4 shadow-xl shadow-gray-500/20 flex justify-center items-center z-50 sticky top-0"
    >
        <div className="flex justify-between items-center w-full max-w-7xl">
            {/* Logo a Název (VŽDY VIDITELNÉ) */}
            <div className="text-xl font-bold flex items-center">
                <Link href="/" className="hover:text-blue-900 transition duration-150 flex items-center">
                    {/* ZMĚNA ZDE: Ikona BusFront je před textem a je zarovnána vodorovně */}
                    <BusFront className='w-7 h-7 mr-2 text-blue-600' />
                    <span className='text-gray-900 mr-1'>DpMost</span><span className='hidden md:flex text-gray-900'>Portál</span>
                </Link>
            </div>
            
            {/* Odkazy (Pouze na Dektopy, skryté na mobilu) */}
            <div className="hidden lg:flex items-center space-x-6">
                <div className="flex space-x-6">
                    {navLinks}
                </div>
                {authActions}
            </div>

            {/* Mobilní: Hamburger Button a Akce (viditelné na mobilu, skryté na desktopu) */}
            <div className="flex items-center lg:hidden space-x-3">
                {authActions} 
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>
        </div>

        {/* Mobilní Menu (Vyskakovací panel) */}
        {isMenuOpen && (
            <div 
                className="absolute top-full left-0 w-full bg-white shadow-lg lg:hidden border-t border-gray-200"
                onClick={() => setIsMenuOpen(false)} // Zavřít menu po kliknutí
            >
                <div className="flex flex-col space-y-2 p-4">
                    {/* Odkazy v mobilním menu */}
                    {navLinks}
                </div>
            </div>
        )}

        {/* KOMPONENTA MODALU */}
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