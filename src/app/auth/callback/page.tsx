// src/app/auth/callback/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Tato komponenta je vyvolána Supabase po úspěšném přihlášení (OAuth flow)
// a zpracuje hash v URL pro uložení relace.
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase automaticky zpracuje relaci z URL hashe.
    // Po krátké prodlevě (pro jistotu, že se relace stihla uložit) přesměrujeme.
    setTimeout(() => {
        // Přesměrování na chráněnou stránku portálu
        router.push('/user-portal/tables'); 
    }, 500); 

    // Poznámka: Next.js Middleware by měl uživatele přesměrovat,
    // pokud zkusí navštívit /auth/callback po vypršení tokenu.
    
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <h1 className="text-xl text-gray-700">Zpracování přihlášení...</h1>
    </div>
  );
}