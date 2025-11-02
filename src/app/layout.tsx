// src/app/layout.tsx

import { AuthProvider } from '@/context/AuthContext'; 
import './globals.css'; 
import Navigace from '@/components/Navigation'; // <-- 1. IMPORTUJTE KOMPONENTU

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>
        <AuthProvider>
          
          {/* 2. VLOŽTE KOMPONENTU NAVIGACE PŘED DĚTI (children) */}
          {/* Navigace se zobrazí na každé stránce obalené tímto layoutem */}
          <Navigace /> 
          
          {/* 3. children představuje obsah aktuální stránky (např. src/app/page.tsx) */}
          <main> 
              {children}
          </main>
          
        </AuthProvider>
      </body>
    </html>
  );
}