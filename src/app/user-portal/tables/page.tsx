// src/app/user-portal/tables/page.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client'; // Klient pro prohlížeč
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import Image from 'next/image';

interface JizdniRad {
  id: number;
  line_number: string;
  kurz_number: string;
  transport_type: 'autobus' | 'tramvaj';
  day_type: 'pracovni' | 'vikend';
  part_of_day: 'ranni' | 'odpoledni';
  image_url: string;
}

const TabulkyPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [jizdniRady, setJizdniRady] = useState<JizdniRad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- STAVY PRO FILTROVÁNÍ ---
  const [transportFilter, setTransportFilter] = useState<'autobus' | 'tramvaj'>('autobus');
  const [dayFilter, setDayFilter] = useState<'pracovni' | 'vikend'>('pracovni');
  const [searchTerm, setSearchTerm] = useState('');

  // Funkce pro načítání dat z Supabase
  const fetchJizdniRady = async () => {
    if (!user) return; 

    setLoading(true);
    setError(null);
    
    // Sestavení dotazu do Supabase
    const query = supabase
      .from('jizdni_rady')
      .select('*')
      .eq('transport_type', transportFilter)
      .eq('day_type', dayFilter)
      .order('line_number', { ascending: true }); // Řazení podle čísla linky

    const { data, error: dbError } = await query;

    if (dbError) {
      setError(`Chyba při načítání jízdních řádů: ${dbError.message}`);
      setJizdniRady([]);
    } else {
      setJizdniRady(data as JizdniRad[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && !isAuthLoading) {
      fetchJizdniRady();
    }
  }, [user, transportFilter, dayFilter, isAuthLoading]); // Opakované spuštění při změně filtru

  // --- FILTROVÁNÍ NA ZÁKLADĚ VYHLEDÁVÁNÍ (klient-side) ---
  const filteredJizdniRady = useMemo(() => {
    if (!searchTerm) {
      return jizdniRady;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return jizdniRady.filter(rad => 
      rad.line_number.includes(lowerCaseSearch) ||
      rad.part_of_day.toLowerCase().includes(lowerCaseSearch)
      // Můžete přidat i vyhledávání ve sloupci 'keywords', pokud ho implementujete
    );
  }, [jizdniRady, searchTerm]);


  if (isAuthLoading || loading) {
    return <div className="p-8 text-center"><p>Načítání jízdních řádů a uživatelského stavu...</p><GridLoader  color="#0066ff" /></div>;
  }

  if (error) {
    return <div className="p-8 text-red-600 font-bold">Chyba: {error}</div>;
  }

  // Rozdělení dat na ranní a odpolední část pro zobrazení
  const ranniRady = filteredJizdniRady.filter(r => r.part_of_day === 'ranni');
  const odpoledniRady = filteredJizdniRady.filter(r => r.part_of_day === 'odpoledni');
  
  // --- JSX VYKRESLENÍ ---

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">🚎 Tabulky Jízdních Řádů (MHD Portál)</h1>
      
      {/* Sekce Filtrů a Vyhledávání */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 flex flex-wrap gap-4 items-center">
        
        {/* Filtr Typ Dopravy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doprava:</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setTransportFilter('autobus')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                transportFilter === 'autobus' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Autobus 🚌
            </button>
            <button
              onClick={() => setTransportFilter('tramvaj')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                transportFilter === 'tramvaj' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tramvaj 🚋
            </button>
          </div>
        </div>

        {/* Filtr Dny Provozu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dny Provozu:</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setDayFilter('pracovni')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                dayFilter === 'pracovni' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pracovní Dny
            </button>
            <button
              onClick={() => setDayFilter('vikend')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                dayFilter === 'vikend' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Víkend
            </button>
          </div>
        </div>

        {/* Vyhledávání */}
        <div className="ml-auto min-w-[200px]">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Hledat v tabulkách:</label>
          <input
            type="text"
            id="search"
            placeholder="Hledej číslo linky..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      {/* Vykreslení Ranní Části */}
      <h2 className="text-2xl font-bold mt-8 mb-4 border-b pb-2 text-gray-700">🌅 Ranní Část</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ranniRady.length > 0 ? (
          ranniRady.map((rad) => (
            <div key={rad.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <h3 className="text-xl font-semibold p-4 bg-gray-100 text-gray-800 border-b">Linka {rad.line_number}</h3>
              <div className="relative w-full h-64">
                {/* Zobrazení obrázku (předpokládá se, že Supabase Storage URL je veřejné) */}
                <Image 
                    src={rad.image_url} 
                    alt={`Jízdní řád linky ${rad.line_number} - Ranní`} 
                    fill 
                    style={{ objectFit: 'contain' }}
                    className="p-2"
                />
              </div>
              <div className="p-4 pt-0">
                 <a href={rad.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">Zobrazit celý řád</a>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-3 text-gray-500">Pro zvolené filtry nejsou k dispozici žádné ranní jízdní řády.</p>
        )}
      </div>

      {/* Vykreslení Odpolední Části */}
      <h2 className="text-2xl font-bold mt-10 mb-4 border-b pb-2 text-gray-700">🌇 Odpolední Část</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {odpoledniRady.length > 0 ? (
          odpoledniRady.map((rad) => (
            <div key={rad.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <h3 className="text-xl font-semibold p-4 bg-gray-100 text-gray-800 border-b">Linka {rad.line_number}</h3>
              <div className="relative w-full h-64">
                <Image 
                    src={rad.image_url} 
                    alt={`Jízdní řád linky ${rad.line_number} - Odpolední`} 
                    fill 
                    style={{ objectFit: 'contain' }}
                    className="p-2"
                />
              </div>
              <div className="p-4 pt-0">
                 <a href={rad.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">Zobrazit celý řád</a>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-3 text-gray-500">Pro zvolené filtry nejsou k dispozici žádné odpolední jízdní řády.</p>
        )}
      </div>

    </div>
  );
};

export default TabulkyPage;