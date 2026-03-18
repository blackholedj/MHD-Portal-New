// src/app/admin/layout.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Získá aktuálně vybranou záložku, defaultně 'jizdni-rady'
  const activeTab = searchParams.get('tab') || 'jizdni-rady'; 

  useEffect(() => {
    if (!isLoading) {
      if (role !== 'admin') {
        alert('Přístup povolen pouze administrátorům!');
        router.push('/');
      }
    }
  }, [role, isLoading, router]);

  if (isLoading || role !== 'admin') {
    return <div className="p-10 text-center text-gray-500 dark:text-gray-400">Ověřování admin oprávnění...</div>;
  }
  
  // Pomocná funkce pro generování URL pro záložky
  const getTabUrl = (tabName: string, extraPath?: string) => {
        if (extraPath) {
            return `/admin/${extraPath}?tab=${tabName}`;
        }
        return `/admin/dashboard?tab=${tabName}`;
    };

    // Definice všech záložek pro snadnější údržbu a mapování
    const adminTabs = [
        { name: 'jizdni-rady', label: 'Tabulky 🚆', extraPath: 'dashboard', color: 'blue' },
        { name: 'dokumenty', label: 'Dokumenty 📃', extraPath: 'dashboard', color: 'green' },
        { name: 'oznameni', label: 'Oznámení 🔔', extraPath: 'oznameni', color: 'purple' },
        { name: 'users', label: 'Uživatelé 👤', extraPath: 'users', color: 'red' },
        { name: 'contact', label: 'Kontaktní zprávy 📬', extraPath: 'contact', color: 'yellow' },
    ];
    
  return (
    
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* HLAVNÍ OBSAH: Zajišťuje max. šířku a centrování v ose X */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8"> {/* <- KLÍČOVÉ ZMĚNY ZDE: max-w-7xl a mx-auto */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800 dark:text-zinc-50">
          🔑 Admin Dashboard
        </h1>
      
        {/* Admin Navigace (Záložky) */}
        <nav className="w-full bg-white dark:bg-zinc-800 p-1 rounded-t-lg shadow-md overflow-x-auto">
            <div className="flex border-b border-gray-200 dark:border-zinc-700">
              {adminTabs.map((tab) => (
                  <Link
                      key={tab.name}
                      href={getTabUrl(tab.name, tab.extraPath === 'dashboard' ? undefined : tab.extraPath)}
                      className={`
                          py-3 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                          ${activeTab === tab.name 
                              ? `border-b-4 border-${tab.color}-600 dark:border-${tab.color}-400 text-${tab.color}-700 dark:text-${tab.color}-400`
                              : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-50 hover:bg-gray-50 dark:hover:bg-zinc-700'
                          }
                      `}
                  >
                      {tab.label}
                  </Link>
              ))}
            </div>
        </nav>
      
        {/* Obsah stránky (zobrazení záložky) */}
        <div className="w-full bg-white dark:bg-zinc-800 p-4 sm:p-6 rounded-b-lg shadow-lg min-h-[50vh]">
            {children}
        </div>
      </main>
    </div>
  );
}