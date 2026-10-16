// src/app/layout.tsx
// Tento soubor definuje hlavní layout aplikace, který se použije na všech stránkách.
// Obsahuje navigační komponentu, kontext pro autentizaci a další globální nastavení.
// Importy potřebných modulů a komponent, včetně kontextu pro autentizaci, globálních stylů, navigace, banneru a registrace service workeru.

import { AuthProvider } from '@/context/AuthContext'; 
import './globals.css'; 
import Navigace from '@/components/Navigation'; // <-- 1. IMPORTUJTE KOMPONENTU
import AnnouncementBanner from '@/components/common/AnnouncementBanner'; // Import banneru
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <head>
        {/* PWA METADATA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DpMost Portal" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0070f3" /> 
        {/* ... (Další meta tagy, které už máte) ... */}
      </head>
      <body>
        <AuthProvider>
          {/* 2. VLOŽTE KOMPONENTU NAVIGACE PŘED DĚTI (children) */}
          {/* Navigace se zobrazí na každé stránce obalené tímto layoutem */}
          <Navigace /> 
          <AnnouncementBanner /> {/* Vložení banneru */}
          {/* 3. children představuje obsah aktuální stránky (např. src/app/page.tsx) */}
          <main>
              <ServiceWorkerRegistration /> 
              {children}
          </main>
          
        </AuthProvider>
      </body>
    </html>
  );
}