// src/app/admin/layout.tsx

'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams!
import React, { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // Získá aktuální URL parametry
  
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
    return <div className="p-10 text-center">Ověřování admin oprávnění...</div>;
  }
  
  // Funkce pro získání URL s nastavenou novou záložkou
  const getTabUrl = (tabName: string) => `/admin/dashboard?tab=${tabName}`;
  const getTabUrlExt = (tabName: string, extraPath: string) => `/admin/${extraPath}?tab=${tabName}`;

  // Logika AdminDashboardu se přesouvá do children, ale navigace zůstává zde
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-800">
        🔑 Admin Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Admin Navigace (Menu) */}
        <nav className="col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4">Správa</h2>
          <ul className="space-y-2">
            
            <li>
              <Link 
                href={getTabUrl('jizdni-rady')} 
                className={`block p-2 rounded transition ${
                  activeTab === 'jizdni-rady' 
                    ? 'bg-blue-100 text-blue-800 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Nahrát Jízdní řády 🚆
              </Link>
            </li>
            
            <li>
              <Link 
                href={getTabUrl('dokumenty')} 
                className={`block p-2 rounded transition ${
                  activeTab === 'dokumenty' 
                    ? 'bg-green-200 text-green-800 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Nahrát Dokumenty 📃
              </Link>
            </li>
            
            <li>
              <Link 
                href={getTabUrlExt('users', 'users')}
                className={`block p-2 rounded transition ${
                  activeTab === 'users' 
                    ? 'bg-red-100 text-red-800 font-semibold border-l-4 border-red-500' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Správa Uživatelských Rolí 👤
              </Link>
            </li>

            <li>
              <Link 
                href={getTabUrlExt('contact', 'contact')}
                className={`block p-2 rounded transition ${
                  activeTab === 'contact' 
                    ? 'bg-yellow-100 text-yellow-800 font-semibold border-l-4 border-red-500' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Správa Kontaktních zpráv 📬
              </Link>
            </li>

         </ul>
        </nav>
        
        {/* Obsah stránky (dashboard/page.tsx) */}
        <div className="col-span-3">
            {children}
        </div>
      </div>
    </div>
  );
}