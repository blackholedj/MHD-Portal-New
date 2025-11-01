// src/app/user-portal/dokumenty/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Document {
  id: number;
  created_at: string;
  title: string;
  description: string;
  file_path: string;
  admin_only: boolean;
}

const DokumentyPage = () => {
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isAuthLoading) return;

    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      
      // Načtení všech dokumentů pro přihlášeného uživatele
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtr pro uživatele s rolí 'user' (admin vidí vše)
      if (role === 'user') {
          query = query.eq('admin_only', false); // Pouze dokumenty, které nejsou jen pro admina
      }
      
      const { data, error: dbError } = await query;

      if (dbError) {
        setError(`Chyba při načítání dokumentů: ${dbError.message}`);
        setDocuments([]);
      } else {
        setDocuments(data as Document[]);
      }
      setLoading(false);
    };

    fetchDocuments();

  }, [user, role, isAuthLoading]);

  // Funkce pro získání URL k dokumentu (pro bezpečné stahování)
  const getDownloadUrl = (filePath: string): string => {
    // Používáme metodu 'createSignedUrl', která je bezpečnější pro ne-veřejné soubory
    // DŮLEŽITÉ: Pro zjednodušení v klientu budeme generovat PUBLIC URL.
    // Pro vyšší bezpečnost v reálném světě byste použili Server Component nebo API Route
    // pro generování *podepsané* (signed) URL na serveru.
    
    // Zatím použijeme veřejnou cestu (pro zjednodušení implementace s RLS)
    const publicUrl = supabase.storage.from('documents').getPublicUrl(filePath);
    return publicUrl.data.publicUrl;
  };
  
  if (isAuthLoading || loading) {
    return <div className="p-8 text-center">Načítání dokumentů...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600 font-bold">Chyba: {error}</div>;
  }
  
  // V případě, že RLS chrání dokumenty, je nutné zajistit, že je bucket VEŘEJNÝ,
  // jinak se musí použít metoda `createSignedUrl` na Server Side (ne v této klientské komponentě).
  // Předpokládejme, že bucket je nastaven jako veřejný, ale chráněný RLS.

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">📄 Důležité Dokumenty</h1>
      
      {documents.length === 0 ? (
        <div className="p-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
          V současné době nejsou k dispozici žádné dokumenty.
        </div>
      ) : (
        <ul className="space-y-4">
          {documents.map((doc) => {
            const downloadUrl = getDownloadUrl(doc.file_path);

            return (
              <li key={doc.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition">
                <Link 
                  href={downloadUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  // 'download' atribut by vynutil stažení, ale pro PDF je lepší jej otevřít v prohlížeči
                  className="block text-blue-600 hover:text-blue-800 font-semibold text-xl"
                >
                  {doc.title}
                  {doc.admin_only && (
                      <span className="ml-3 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
                  )}
                </Link>
                <p className="text-gray-600 mt-1">{doc.description}</p>
                <p className="text-xs text-gray-400 mt-2">Nahráno: {new Date(doc.created_at).toLocaleDateString('cs-CZ')}</p>
              </li>
            );
          })}
        </ul>
      )}
      
      {/* Poznámka pro admina o nahrávání */}
      {role === 'admin' && (
        <div className="mt-8 p-4 bg-purple-50 border-l-4 border-purple-400 text-purple-700 rounded-lg">
            <p className="font-semibold">Tip pro ADMINA:</p>
            <p className="text-sm">Dokumenty nahrávejte přímo do Supabase Storage (bucket `documents`) a poté manuálně nebo přes dedikovaný formulář vložte metadata (název, popis, file_path) do databázové tabulky `documents`.</p>
        </div>
      )}

    </div>
  );
};

export default DokumentyPage;