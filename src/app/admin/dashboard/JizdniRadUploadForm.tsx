'use client';

import React, { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { uploadTimetableFile } from '@/lib/storage/timetable-upload';
import { useAuth } from '@/context/AuthContext';

/* Typy pro typy dopravy, dny a části dne */
type TransportType = 'autobus' | 'tramvaj';
type DayType = 'pracovni' | 'vikend';
type PartOfDay = 'ranni' | 'odpoledni';

/* Komponenta pro nahrávání jízdních řádů */
const JizdniRadUploadForm = () => {
    const { user } = useAuth();

    const [lineNumber, setLineNumber] = useState('');
    const [courseNumber, setCourseNumber] = useState('');
    const [transportType, setTransportType] = useState<TransportType>('autobus');
    const [dayType, setDayType] = useState<DayType>('pracovni');

    const [ranniFile, setRanniFile] = useState<File | null>(null);
    const [odpoledniFile, setOdpoledniFile] = useState<File | null>(null);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        setFile(e.target.files ? e.target.files[0] : null);
        setSuccess(null);
        setError(null);
    };

    /* // 🛠️ FUNKCE PRO KOMPRESI OBRÁZKU NA STRANĚ KLIENTA */
    const compressImageIfNeeded = (file: File): Promise<Blob | File> => {
        return new Promise((resolve) => {
            // Pokud to není obrázek (např. PDF), kompresi přeskočíme
            if (!file.type.startsWith('image/')) {
                return resolve(file);
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    /* // Nastavení maximální dimenze (šířka nebo výška) na 1600px pro zachování čitelnosti textu JŘ */
                    const MAX_SIZE = 1600;
                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        if (width > height) {
                            height = Math.round((height * MAX_SIZE) / width);
                            width = MAX_SIZE;
                        } else {
                            width = Math.round((width * MAX_SIZE) / height);
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Export do JPEG s 80% kvalitou (drastická úspora velikosti při zachování detailů)
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                resolve(file); // Záloha: pokud komprese selže, vrátíme původní soubor
                            }
                        },
                        'image/jpeg',
                        0.8
                    );
                };
            };
        });
    };

    // Upload one file; metadata for all selected parts is saved together.
    const uploadFile = async (file: File, partOfDay: PartOfDay, line: string, course: string, type: TransportType, day: DayType) => {
        // 1. Spustíme kompresi (pokud jde o obrázek, vrátí se zkomprimovaný Blob)
        const processedBlobOrFile = await compressImageIfNeeded(file);

        // Zjistíme příponu. Pokud jsme komprimovali obrázek, ukládáme jako .jpg
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            throw new Error('Vyberte obrázek nebo PDF.');
        }

        // Určíme správný content-type pro storage
        const contentType = file.type.startsWith('image/') ? 'image/jpeg' : file.type;

        const filePath = await uploadTimetableFile(processedBlobOrFile, contentType);

        return {
            // Historical database convention: course_number stores the actual line.
            line_number: course,
            course_number: line,
            transport_type: type,
            day_type: day,
            part_of_day: partOfDay,
            image_path: filePath,
            image_url: null,
        };
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !lineNumber.trim() || !courseNumber.trim() || (!ranniFile && !odpoledniFile)) {
            setError('Vyplňte pole a nahrajte alespoň jeden jízdní řád (ranní nebo odpolední).');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const records = [];
            if (ranniFile) {
                records.push(await uploadFile(ranniFile, 'ranni', lineNumber.trim(), courseNumber.trim(), transportType, dayType));
            }
            if (odpoledniFile) {
                records.push(await uploadFile(odpoledniFile, 'odpoledni', lineNumber.trim(), courseNumber.trim(), transportType, dayType));
            }

            // Both parts are committed by one database transaction.
            const { data, error: dbError } = await supabase.rpc('create_jizdni_rad', { p_records: records });
            if (dbError) {
                throw new Error(dbError.code === '23505'
                    ? 'Tento jízdní řád již existuje. Obnovte seznam a použijte úpravu.'
                    : `Uložení se nepodařilo potvrdit: ${dbError.message}`);
            }
            if (!Array.isArray(data) || data.length !== records.length) {
                throw new Error('Výsledek uložení se nepodařilo potvrdit. Před opakováním obnovte seznam.');
            }
            setSuccess(`Úspěšně uloženo ${records.length} částí jízdního řádu.`);
            setLineNumber('');
            setCourseNumber('');
            setRanniFile(null);
            setOdpoledniFile(null);
        } catch (err: unknown) {
            // A missing response can follow a successful commit. Never delete uploads here.
            setError((err instanceof Error ? err.message : 'Uložení se nepodařilo potvrdit.') +
                ' Před dalším pokusem obnovte seznam jízdních řádů. Nahrané soubory zůstaly zachovány.');
        }

        setLoading(false);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-md border border-blue-100 dark:border-zinc-700 text-gray-900 dark:text-zinc-100">
            <h3 className="text-2xl font-bold mb-4 text-blue-800 dark:text-blue-300 border-b border-gray-200 dark:border-zinc-700 pb-2">Nahrát nový Jízdní Řád</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                {success && <div className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 p-3 rounded font-medium">{success}</div>}
                {error && <div className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 rounded font-medium">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="lineNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-200">Číslo Linky</label>
                        <input
                            type="text"
                            id="lineNumber"
                            value={lineNumber}
                            onChange={(e) => setLineNumber(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm p-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                            placeholder="3"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="courseNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-200">Číslo Kurzu</label>
                        <input
                            type="text"
                            id="courseNumber"
                            value={courseNumber}
                            onChange={(e) => setCourseNumber(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm p-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                            placeholder="101"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="transportType" className="block text-sm font-medium text-gray-700 dark:text-zinc-200">Typ Dopravy</label>
                        <select
                            id="transportType"
                            value={transportType}
                            onChange={(e) => setTransportType(e.target.value as TransportType)}
                            className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm p-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                        >
                            <option value="autobus">Autobus 🚌</option>
                            <option value="tramvaj">Tramvaj 🚋</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="dayType" className="block text-sm font-medium text-gray-700 dark:text-zinc-200">Dny Provozu</label>
                        <select
                            id="dayType"
                            value={dayType}
                            onChange={(e) => setDayType(e.target.value as DayType)}
                            className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm p-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                        >
                            <option value="pracovni">Pracovní dny</option>
                            <option value="vikend">Víkend</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-200 dark:border-zinc-700 p-4 rounded-md bg-gray-50 dark:bg-zinc-800/60">
                    <div>
                        <label htmlFor="ranniFile" className="block text-sm font-bold text-gray-700 dark:text-zinc-200 mb-2">1. Jízdní Řád - RANNÍ ČÁST (volitelné)</label>
                        <input
                            type="file"
                            id="ranniFile"
                            onChange={(e) => handleFileChange(e, setRanniFile)}
                            className="mt-1 block w-full text-sm text-gray-500 dark:text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800"
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                    </div>

                    <div>
                        <label htmlFor="odpoledniFile" className="block text-sm font-bold text-gray-700 dark:text-zinc-200 mb-2">2. Jízdní Řád - ODPOLEDNÍ ČÁST (volitelné)</label>
                        <input
                            type="file"
                            id="odpoledniFile"
                            onChange={(e) => handleFileChange(e, setOdpoledniFile)}
                            className="mt-1 block w-full text-sm text-gray-500 dark:text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800"
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                    </div>
                </div>

                <p className='text-sm text-gray-600 dark:text-zinc-400 pt-2'>Poznámka: Obrázky jsou před nahráním automaticky zkomprimovány pro úsporu mobilních dat řidičů.</p>

                <button
                    type="submit"
                    disabled={loading || !lineNumber.trim() || !courseNumber.trim() || (!ranniFile && !odpoledniFile)}
                    className="w-full bg-blue-600 dark:bg-blue-600 text-white py-3 px-4 rounded-md shadow-lg hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                    {loading ? 'Komprimuji a nahrávám...' : 'Nahrat Jízdní Řád(y)'}
                </button>
            </form>
        </div>
    );
};

export default JizdniRadUploadForm;