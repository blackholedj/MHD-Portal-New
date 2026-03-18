// src/app/admin/dashboard/JizdniRadUploadForm.tsx

'use client';

import React, { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { v4 as uuidv4 } from 'uuid'; 

type TransportType = 'autobus' | 'tramvaj';
type DayType = 'pracovni' | 'vikend';
type PartOfDay = 'ranni' | 'odpoledni'; // Zachováme pro interní logiku vkládání

const JizdniRadUploadForm = () => {
  const { user } = useAuth();
  
  const [lineNumber, setLineNumber] = useState('');
  const [courseNumber, setCourseNumber] = useState('');
  const [transportType, setTransportType] = useState<TransportType>('autobus');
  const [dayType, setDayType] = useState<DayType>('pracovni');
  
  // NOVÉ: Dva samostatné stavy pro soubory
  const [ranniFile, setRanniFile] = useState<File | null>(null);
  const [odpoledniFile, setOdpoledniFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const BUCKET_NAME = 'jizdni-rady'; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    setFile(e.target.files ? e.target.files[0] : null);
    setSuccess(null);
    setError(null);
  };
  
  // Pomocná funkce pro nahrání jednoho souboru a uložení záznamu
  const uploadAndInsert = async (file: File, partOfDay: PartOfDay, line: string, course: string, type: TransportType, day: DayType) => {
    const fileExtension = file.name.split('.').pop();
    // Cesta: jizdni-rady/linka/kurz/ranni-pracovni/uuid.pdf
    const filePath = `${line}/${course}/${partOfDay}-${day}/${uuidv4()}.${fileExtension}`; 

    // 1. Nahrání souboru do Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      throw new Error(`Chyba při nahrávání souboru (${partOfDay}): ${uploadError.message}`);
    }
    
    // 2. Uložení metadat do databáze
    const { error: dbError } = await supabase
      .from('jizdni_rady')
      .insert({
        line_number: line,
        course_number: course,
        transport_type: type,
        day_type: day,
        part_of_day: partOfDay, // ZDE je klíčové
        image_url: supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath).data.publicUrl,
      });

    if (dbError) {
        throw new Error(`Soubor byl nahrán, ale metadata (${partOfDay}) se nepodařilo uložit: ${dbError.message}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !lineNumber || !courseNumber || (!ranniFile && !odpoledniFile)) {
      setError('Vyplňte číslo linky, číslo kurzu a nahrajte alespoň jeden jízdní řád (ranní nebo odpolední).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    let uploadedCount = 0;

    try {
        // A. Zpracování RANNÍ ČÁSTI
        if (ranniFile) {
            await uploadAndInsert(ranniFile, 'ranni', lineNumber, courseNumber, transportType, dayType);
            uploadedCount++;
        }

        // B. Zpracování ODPOLEDNÍ ČÁSTI
        if (odpoledniFile) {
            await uploadAndInsert(odpoledniFile, 'odpoledni', lineNumber, courseNumber, transportType, dayType);
            uploadedCount++;
        }

        if (uploadedCount > 0) {
            setSuccess(`Úspěšně nahráno ${uploadedCount} jízdních řádů pro Linku ${lineNumber}, Kurz ${courseNumber}.`);
            // Vyčištění formuláře
            setLineNumber('');
            setCourseNumber('');
            setRanniFile(null);
            setOdpoledniFile(null);
        } else {
             // Tato větev by neměla nastat díky počáteční kontrole, ale pro jistotu:
             setError('Nebyly vybrány žádné soubory k nahrání.');
        }

    } catch (err: any) {
        setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
      <h3 className="text-2xl font-bold mb-4 text-blue-800 border-b pb-2">Nahrát nový Jízdní Řád</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && <div className="bg-green-100 text-green-700 p-3 rounded font-medium">{success}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded font-medium">{error}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Číslo linky */}
            <div>
                <label htmlFor="lineNumber" className="block text-sm font-medium text-gray-700">Číslo Kurzu</label>
                <input
                    type="text"
                    id="lineNumber"
                    value={lineNumber}
                    onChange={(e) => setLineNumber(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="3"
                    required
                />
            </div>

            {/* Číslo kurzu */}
            <div>
                <label htmlFor="courseNumber" className="block text-sm font-medium text-gray-700">Číslo Linky</label>
                <input
                    type="text"
                    id="courseNumber"
                    value={courseNumber}
                    onChange={(e) => setCourseNumber(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="101"
                    required
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Typ Dopravy */}
            <div>
                <label htmlFor="transportType" className="block text-sm font-medium text-gray-700">Typ Dopravy</label>
                <select
                    id="transportType"
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value as TransportType)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                    <option value="autobus">Autobus 🚌</option>
                    <option value="tramvaj">Tramvaj 🚋</option>
                </select>
            </div>

            {/* Dny Provozu */}
            <div>
                <label htmlFor="dayType" className="block text-sm font-medium text-gray-700">Dny Provozu</label>
                <select
                    id="dayType"
                    value={dayType}
                    onChange={(e) => setDayType(e.target.value as DayType)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                    <option value="pracovni">Pracovní dny</option>
                    <option value="vikend">Víkend</option>
                </select>
            </div>
        </div>
        
        {/* NOVÉ: Dva souborové vstupy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-md bg-gray-50">
            {/* Ranní Část */}
            <div>
                <label htmlFor="ranniFile" className="block text-sm font-bold text-gray-700 mb-2">1. Jízdní Řád - RANNÍ ČÁST (volitelné)</label>
                <input
                    type="file"
                    id="ranniFile"
                    onChange={(e) => handleFileChange(e, setRanniFile)}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    accept=".pdf,.jpg,.jpeg,.png"
                />
            </div>

            {/* Odpolední Část */}
            <div>
                <label htmlFor="odpoledniFile" className="block text-sm font-bold text-gray-700 mb-2">2. Jízdní Řád - ODPOLEDNÍ ČÁST (volitelné)</label>
                <input
                    type="file"
                    id="odpoledniFile"
                    onChange={(e) => handleFileChange(e, setOdpoledniFile)}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    accept=".pdf,.jpg,.jpeg,.png"
                />
            </div>
        </div>
        
        <p className='text-sm text-gray-600 pt-2'>Poznámka: Musíte nahrát alespoň jeden soubor (ranní nebo odpolední). Pokud nahrajete oba, vytvoří se dva záznamy v databázi.</p>


        <button
          type="submit"
          disabled={loading || !lineNumber || !courseNumber || (!ranniFile && !odpoledniFile)}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md shadow-lg hover:bg-blue-700 disabled:opacity-50 font-bold"
        >
          {loading ? 'Nahrávám JŘ a ukládám metadata...' : 'Nahrát Jízdní Řád(y)'}
        </button>
      </form>
    </div>
  );
};

export default JizdniRadUploadForm;