// src/app/user-portal/layout.tsx

'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation'; // <-- Přidán usePathname
import { useEffect } from 'react';
import { GridLoader } from 'react-spinners';

const UserPortalLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, is_blocked, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // <-- Získání aktuální cesty
  
  const PENDING_PATH = '/pending-info';
  const BLOCKED_PATH = '/blocked';
  const DEFAULT_PORTAL_PATH = '/user-portal/tables'; // Předpokládaná domovská stránka portálu

  useEffect(() => {
    console.log("AKTUALNI STAVY: ",status," Blokovaný: ", is_blocked, " Cesta: ",pathname);
    if (isLoading) return; 

    // 1. KONTROLA, ZDA JE UŽIVATEL PŘIHLÁŠEN
    if (!user) {
      router.push('/login');
      return;
    }
    
    // 2. KONTROLA BLOKOVANÉHO UŽIVATELE (is_blocked = true)
    if (is_blocked) {
      if (pathname !== BLOCKED_PATH) {
        router.push(BLOCKED_PATH); 
      }
      return;
    }

    // 3. KONTROLA NESSCHVÁLENÉHO UŽIVATELE (status = 'pending')
    if (status === 'pending') {
      // Pokud UŽIVATEL ČEKÁ a NENÍ na informační stránce, přesměruj ho tam.
      if (pathname !== PENDING_PATH) {
        router.push(PENDING_PATH);
      }
      return; // Ukončíme, aby se nevykonávala další logika
    }
    
    // 4. KONTROLA SCHVÁLENÉHO UŽIVATELE (status = 'approved')
    // Zde je oprava: Schválený uživatel NESMÍ ZŮSTAT na chybových/informačních stránkách.
    if (status === 'approved') {
      // Pokud je UŽIVATEL SCHVÁLEN a je stále na stránce pro ČEKÁNÍ nebo BLOKOVÁNÍ
      if (pathname === PENDING_PATH || pathname === BLOCKED_PATH) {
        // Přesměruj ho na hlavní portál (např. /user-portal)
        router.push(DEFAULT_PORTAL_PATH);
        return;
      }
    }

    // 5. Pokud je vše v pořádku (Approved a není na chybové stránce), vykreslí se children.

  // Důležité: Přidány proměnné is_blocked, status a pathname do závislostí
  }, [user, isLoading, is_blocked, status, router, pathname]); 

  if (isLoading) {
    // Vykreslení načítací obrazovky
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <GridLoader color="#0066ff" size={15} />
        <p className='ml-4'>Načítám uživatelský stav...</p>
      </div>
    );
  }
  
  // Blokování vykreslení obsahu pro neschválené/blokované uživatele
  if (!user || is_blocked || status === 'pending') {
    // Vrátíme null, aby se nevykreslil chráněný obsah, pokud se čeká na přesměrování
    return null;
  }

  // Vykreslení obsahu pro schválené a neblokované uživatele
  return <>{children}</>;
};

export default UserPortalLayout;