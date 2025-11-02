// src/app/user-portal/dokumenty/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import Link from 'next/link';
import { FileText, BookOpen, Settings, Info } from 'lucide-react'; // Ikony pro typy

// --- TYPY DAT Z DATABÁZE ---
interface Document {
  id: string;
  title: string;
  description: string | null;
  file_path: string; // Cesta k souboru ve Storage
  admin_only: boolean; // Důležité: filtrujeme, aby se nezobrazovaly dokumenty jen pro adminy
  type: 'smernice' | 'manualy' | 'jine'; // Předpokládaný nový sloupec pro filtrování
  created_at: string;
}

// Typy pro filtr
type DocumentType = 'all' | 'smernice' | 'manualy' | 'jine';

// ----------------------------------------------------------------------
// --- POMOCNÉ FUNKCE A IKONY ---
// ----------------------------------------------------------------------

const getTypeIcon = (type: DocumentType) => {
    switch (type) {
        case 'smernice':
            return <FileText className="w-5 h-5 text-blue-600" />;
        case 'manualy':
            return <BookOpen className="w-5 h-5 text-green-600" />;
        case 'jine':
            return <Info className="w-5 h-5 text-yellow-600" />;
        default:
            return <FileText className="w-5 h-5 text-gray-500" />;
    }
};

const getTypeName = (type: DocumentType) => {
    switch (type) {
        case 'smernice':
            return 'Směrnice';
        case 'manualy':
            return 'Manuály';
        case 'jine':
            return 'Jiné dokumenty';
        default:
            return 'Všechny typy';
    }
};

// ----------------------------------------------------------------------
// --- HLAVNÍ KOMPONENTA DOKUMENTŮ ---
// ----------------------------------------------------------------------

const DocumentsPage = () => {
  const { user, isLoading: isAuthLoading, status } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedType, setSelectedType] = useState<DocumentType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Funkce pro získání Public URL pro stažení souboru
  const getDownloadUrl = (filePath: string) => {
    // Používá file_path uloženou v DB a vytvoří podepsanou URL
    const { data } = supabase.storage
      .from('documents') // Název bucketu
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoadingData(true);
    setError(null);

    let query = supabase
      .from('documents')
      .select('*')
      .eq('admin_only', false) // ZAJIŠTĚNÍ: Zobrazujeme jen dokumenty, které nejsou jen pro adminy
      .order('created_at', { ascending: false });

    if (selectedType !== 'all') {
      query = query.eq('type', selectedType);
    }
    
    if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`); // Hledání v názvu
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Chyba při načítání dokumentů:', fetchError);
      setError('Nepodařilo se načíst dokumenty. Zkontrolujte RLS politiky.');
    } else {
      setDocuments(data as Document[] || []);
    }
    setIsLoadingData(false);
  }, [selectedType, searchTerm]); // Načítat při změně typu nebo hledaného výrazu

  useEffect(() => {
    if (!isAuthLoading && user) {
        fetchDocuments();
    }
  }, [isAuthLoading, user, fetchDocuments]);

  // Loading stavy
  if (isAuthLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <GridLoader color="#4F46E5" size={10} />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">Chyba: {error}</div>;
  }

  // Zde by měla zasáhnout ochrana v layout.tsx pro pending/blocked,
  // ale pro jistotu zkontrolujeme status (ačkoliv by RLS zablokovalo data)
  if (!user || status !== 'approved') {
    return (
        <div className="p-8 text-center bg-white rounded-lg shadow-md mt-10">
            <h1 className="text-2xl text-red-600">Přístup odepřen</h1>
            <p className="text-gray-600">Musíte být schválený uživatel pro přístup do chatu.</p>
        </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Důležité Dokumenty</h1>
      
      {/* Sekce Filtrů a Vyhledávání */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex flex-col md:flex-row gap-4 items-center">
        
        {/* Filtr Typu */}
        <div className="w-full md:w-1/3">
          <label htmlFor="docType" className="block text-sm font-medium text-gray-700 mb-1">Typ Dokumentu</label>
          <select
            id="docType"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType)}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">Všechny typy</option>
            <option value="smernice">Směrnice</option>
            <option value="manualy">Manuály</option>
            <option value="jine">Jiné</option>
          </select>
        </div>
        
        {/* Vyhledávání v Názvu */}
        <div className="w-full md:w-2/3">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Vyhledat (v názvu)</label>
          <div className="flex">
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hledat manuál nebo směrnici..."
              className="block w-full border border-gray-300 rounded-l-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={fetchDocuments} // Spustit explicitní hledání
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-r-md hover:bg-blue-700 transition"
            >
                Hledej
            </button>
          </div>
        </div>
      </div>

      {/* Seznam Dokumentů */}
      {documents.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
          Nebyly nalezeny žádné dokumenty odpovídající vašim kritériím.
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white p-5 rounded-lg shadow flex items-start justify-between hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4">
                {getTypeIcon(doc.type as DocumentType)}
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{doc.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Typ: {getTypeName(doc.type as DocumentType)} | Nahráno: {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              {/* Tlačítko pro stažení */}
              <Link
                href={getDownloadUrl(doc.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md font-semibold hover:bg-green-600 transition shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Stáhnout</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;