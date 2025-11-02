// src/app/user-portal/tabulky/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
//import Link from 'next/link';
import Image from 'next/image';
//import { FileText } from 'lucide-react';

// --- TYPY DAT Z DATABÁZE ---
interface JizdniRad {
  id: string;
  line_number: string;
  course_number: string; 
  transport_type: 'autobus' | 'tramvaj';
  day_type: 'pracovni' | 'vikend';
  part_of_day: 'ranni' | 'odpoledni'; // Zůstává pro identifikaci v DB
  image_url: string; 
  created_at: string;
}

// --- TYP PRO ZOBRAZENÍ (Seskupená data) ---
interface GroupedTimetable {
    line_number: string;
    course_number: string;
    transport_type: 'autobus' | 'tramvaj';
    day_type: 'pracovni' | 'vikend';
    created_at: string;
    files: {
        ranni: JizdniRad | null;
        odpoledni: JizdniRad | null;
    };
}

// --- TYPY FILTRŮ (Část Dne je odstraněna) ---
interface Filters {
  transport_type: 'all' | 'autobus' | 'tramvaj';
  day_type: 'all' | 'pracovni' | 'vikend';
  line_number: string;
  course_number: string; 
}

interface FilterProps {
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onSearch: () => void;
  isLoading: boolean;
}

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  altText: string;
}
// komponenta imagemodal
const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, onClose, altText }) => {
    if (!isOpen || !imageUrl) return null;

    return (
        // Overlay (zatemnění)
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose} 
        >
            <div 
                className="relative w-[90vw] h-[90vh] max-w-6xl max-h-screen p-4 transform transition-transform duration-300"
                onClick={(e) => e.stopPropagation()} // Zamezí zavření kliknutím na obrázek
            >
                <Image
                    src={imageUrl}
                    alt={altText}
                    layout="fill"
                    objectFit="contain" // Zobrazí celý obrázek
                    className="rounded-lg shadow-2xl"
                    unoptimized // Doporučeno pro externí URL, pokud Next.js neoptimalizuje
                />
                
                {/* Tlačítko pro zavření */}
                <button
                    onClick={onClose}
                    className="absolute top-0 right-0 m-4 text-white text-3xl font-bold bg-gray-800 bg-opacity-50 hover:bg-opacity-80 rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 z-50"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};
// ----------------------------------------------------------------------
// --- KOMPONENTA FILTRŮ (ODSTRANĚNA ČÁST DNE) ---
// ----------------------------------------------------------------------
const JizdniRadFilters: React.FC<FilterProps> = ({ filters, onFilterChange, onSearch, isLoading }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Filtrovat Jízdní Řády</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Typ Dopravy */}
        <div>
          <label htmlFor="transportType" className="block text-sm font-medium text-gray-700">Typ Dopravy</label>
          <select
            id="transportType"
            value={filters.transport_type}
            onChange={(e) => onFilterChange({ transport_type: e.target.value as Filters['transport_type'] })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            disabled={isLoading}
          >
            <option value="all">Všechny</option>
            <option value="autobus">Autobus 🚌</option>
            <option value="tramvaj">Tramvaj 🚋</option>
          </select>
        </div>

        {/* Dny Provozu */}
        <div>
          <label htmlFor="dayType" className="block text-sm font-medium text-gray-700">Dny Provozu</label>
          <select
            id="dayType"
            value={filters.day_type}
            onChange={(e) => onFilterChange({ day_type: e.target.value as Filters['day_type'] })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            disabled={isLoading}
          >
            <option value="all">Všechny</option>
            <option value="pracovni">Pracovní dny</option>
            <option value="vikend">Víkend</option>
          </select>
        </div>
        
        {/* Číslo Linky */}
        <div>
          <label htmlFor="lineNumber" className="block text-sm font-medium text-gray-700">Číslo Linky</label>
          <input
            type="text"
            id="lineNumber"
            value={filters.line_number}
            onChange={(e) => onFilterChange({ line_number: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()} 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="3"
            disabled={isLoading}
          />
        </div>
        
        {/* Číslo Kurzu */}
        <div>
          <label htmlFor="courseNumber" className="block text-sm font-medium text-gray-700">Číslo Kurzu</label>
          <input
            type="text"
            id="courseNumber"
            value={filters.course_number}
            onChange={(e) => onFilterChange({ course_number: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()} 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="101"
            disabled={isLoading}
          />
        </div>
      </div>
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 font-bold"
      >
        {isLoading ? 'Hledám...' : 'Použít filtry'}
      </button>
    </div>
  );
};

// ----------------------------------------------------------------------
// --- HLAVNÍ KOMPONENTA JÍZDNÍCH ŘÁDŮ ---
// ----------------------------------------------------------------------
const JizdniRadyPage = () => {
  const { user, isLoading: isAuthLoading, status } = useAuth();
  const [jizdniRady, setJizdniRady] = useState<GroupedTimetable[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- STAVY PRO MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [modalAltText, setModalAltText] = useState('');

  const initialFilters: Filters ={
    transport_type: 'all',
    day_type: 'all',
    line_number: '',
    course_number: '', 
  };
  // 1. Filtr pro uživatelské rozhraní (aktuální zadané hodnoty)
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  
  // 2. Filtr, který skutečně aplikujeme do databáze (pouze po kliku)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

  const handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
    setDraftFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // ZMĚNA 3: Nová funkce pro tlačítko "Použít filtry"
  const handleSearch = useCallback(() => {
      // Při kliknutí zkopírujeme hodnoty z draftu do appliedFilters.
      // Tím se spustí fetchData, která je na appliedFilters závislá.
      setAppliedFilters(draftFilters);
  }, [draftFilters]);
  
   // --- FUNKCE PRO KONTROLU MODALU ---
  const openModal = useCallback((url: string, alt: string) => {
    setModalImageUrl(url);
    setModalAltText(alt);
    setIsModalOpen(true);
  }, []);

   const closeModal = useCallback(() => {
     setIsModalOpen(false);
     setModalImageUrl(null);
     setModalAltText('');
   }, []);

  // Logika pro načítání dat
  const fetchJizdniRady = useCallback(async () => {
    setIsLoadingData(true);
    setError(null);

    let query = supabase
      .from('jizdni_rady')
      .select('*')
      .order('line_number', { ascending: true })
      .order('course_number', { ascending: true });

    if (appliedFilters.transport_type !== 'all') {
      query = query.eq('transport_type', appliedFilters.transport_type);
    }
    if (appliedFilters.day_type !== 'all') {
      query = query.eq('day_type', appliedFilters.day_type);
    }
    if (appliedFilters.line_number) {
      query = query.ilike('line_number', `%${appliedFilters.line_number}%`); 
    }
    if (appliedFilters.course_number) {
      query = query.ilike('course_number', `%${appliedFilters.course_number}%`); 
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('Nepodařilo se načíst jízdní řády. Zkontrolujte RLS politiky.');
      setJizdniRady([]);
    } else {
        // --- KLÍČOVÁ LOGIKA: Seskupení RANNÍ a ODPOLEDNÍ části pod jednu kartu ---
        const groupedData = (data as JizdniRad[]).reduce((acc, current) => {
            // Klíč pro seskupení: Linka-Kurz-Dny
            const key = `${current.line_number}-${current.course_number}-${current.day_type}`;
            
            if (!acc[key]) {
                acc[key] = {
                    line_number: current.line_number,
                    course_number: current.course_number,
                    transport_type: current.transport_type,
                    day_type: current.day_type,
                    created_at: current.created_at,
                    files: { ranni: null, odpoledni: null },
                };
            }
            if (current.part_of_day === 'ranni') {
                acc[key].files.ranni = current;
            } else if (current.part_of_day === 'odpoledni') {
                acc[key].files.odpoledni = current;
            }
            return acc;
        }, {} as Record<string, GroupedTimetable>);
        
        // Převést objekt na pole a seřadit
        const finalDisplayData = Object.values(groupedData).sort((a, b) => 
            a.line_number.localeCompare(b.line_number) || a.course_number.localeCompare(b.course_number)
        );

        setJizdniRady(finalDisplayData);
    }
    setIsLoadingData(false);
  }, [appliedFilters]); 

  useEffect(() => {
    if (!isAuthLoading && user) {
        fetchJizdniRady();
    }
  }, [isAuthLoading, user, fetchJizdniRady]);

  if (isAuthLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <GridLoader color="#0066ff" size={15} />
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
      <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Jízdní Řády</h1>
      
      {/* Filtry */}
      <JizdniRadFilters 
        filters={draftFilters} 
        onFilterChange={handleFilterChange} 
        onSearch={handleSearch}
        isLoading={isLoadingData}
      />

      {/* Seznam Jízdních Řádů */}
      {jizdniRady.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
          Nebyly nalezeny žádné jízdní řády odpovídající vašim kritériím.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {jizdniRady.map((jizdniRad) => (
            <div key={`${jizdniRad.line_number}-${jizdniRad.course_number}-${jizdniRad.day_type}`} 
                 className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
              
              {/* Hlavička */}
              <div className="p-4 bg-blue-50">
                  <h3 className="text-xl font-bold mb-1 text-blue-700">{jizdniRad.line_number}/{jizdniRad.course_number}</h3>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Dny:</span> {jizdniRad.day_type === 'pracovni' ? 'Pracovní dny' : 'Víkend'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Typ:</span> {jizdniRad.transport_type === 'autobus' ? 'Autobus 🚌' : 'Tramvaj 🚋'}
                  </p>
              </div>

              {/* Tělo - Ranní a Odpolední části */}
              <div className="p-4 flex-grow">
                  <div className="flex gap-4"> {/* Flexbox pro zobrazení Ranní a Odpolední vedle sebe */}
                      
                      {/* RANNÍ ČÁST - Karta s náhledem */}
                      <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-gray-800 mb-2 text-center">Ranní</h4>
                          {jizdniRad.files.ranni ? (
                              <div
                                  onClick={() => openModal(jizdniRad.files.ranni!.image_url, `JŘ Ranní ${jizdniRad.line_number}/${jizdniRad.course_number}`)}
                                  className="block border rounded-md overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
                              >
                                  <div className="relative w-full aspect-3/4 bg-gray-200">
                                      <Image
                                          src={jizdniRad.files.ranni.image_url}
                                          alt={`Náhled Ranní JŘ Linka ${jizdniRad.line_number}`}
                                          layout="fill"
                                          objectFit="contain"
                                          className="rounded-md" loading="eager"
                                      />
                                  </div>
                              </div>
                          ) : (
                              <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center text-gray-500 rounded-md border border-dashed">
                                  Není nahráno
                              </div>
                          )}
                      </div>
                      
                      {/* ODPOLEDNÍ ČÁST - Karta s náhledem */}
                      <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-gray-800 mb-2 text-center">Odpolední</h4>
                          {jizdniRad.files.odpoledni ? (
                              <div 
                                  onClick={() => openModal(jizdniRad.files.odpoledni!.image_url, `JŘ Odpolední ${jizdniRad.line_number}/${jizdniRad.course_number}`)}
                                  className="block border rounded-md overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
                              >
                                  <div className="relative w-full aspect-3/4 bg-gray-200">
                                      <Image
                                          src={jizdniRad.files.odpoledni.image_url}
                                          alt={`Náhled Odpolední JŘ Linka ${jizdniRad.line_number}`}
                                          layout="fill"
                                          objectFit="contain"
                                          className="rounded-md" loading="eager"
                                      />
                                  </div>
                              </div>
                          ) : (
                              <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center text-gray-500 rounded-md border border-dashed">
                                  Není nahráno
                              </div>
                          )}
                      </div>
                  </div>
                </div>
            </div>
          ))}
        </div>
      )}
      {/* Vykreslení modálního okna na konci */}
      <ImageModal 
          isOpen={isModalOpen}
          imageUrl={modalImageUrl}
          onClose={closeModal}
          altText={modalAltText}
      />

    </div>
  );
};

export default JizdniRadyPage;