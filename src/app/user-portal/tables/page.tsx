// src/app/user-portal/tabulky/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { uploadTimetableFile } from '@/lib/storage/timetable-upload';
import {
    getPrivateFileUrl,
    resolvePrivateStoragePath,
} from '@/lib/supabase/private-storage';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import Image from 'next/image';
import { Edit, Trash2, Loader2, Upload } from 'lucide-react';

// --- TYPY DAT Z DATABÁZE ---
// Historical storage convention: course_number contains the actual line,
// line_number contains the actual course. Keep database keys unchanged;
// filters, navigation and editing below use that existing convention.
interface JizdniRad {
    id: string;
    course_number: string;
    line_number: string;
    transport_type: 'autobus' | 'tramvaj';
    day_type: 'pracovni' | 'vikend';
    part_of_day: 'ranni' | 'odpoledni';
    image_url: string | null;
    image_path: string | null;
    revision: number;
    keywords?: string | null;
    signed_url?: string | null;
    created_at: string;
}

// --- TYP PRO ZOBRAZENÍ (Seskupená data) ---
interface GroupedTimetable {
    is_active: boolean;
    course_number: string;
    line_number: string;
    transport_type: 'autobus' | 'tramvaj';
    day_type: 'pracovni' | 'vikend';
    created_at: string;
    files: {
        ranni: JizdniRad | null;
        odpoledni: JizdniRad | null;
    };
}

interface Filters {
    transport_type: 'all' | 'autobus' | 'tramvaj';
    day_type: 'all' | 'pracovni' | 'vikend';
    course_number: string;
    line_number: string;
}

// ======================================================================
// === 1. KOMPONENTA IMAGE MODAL ===
// ======================================================================
interface ImageModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
    altText: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, onClose, altText }) => {
    if (!isOpen || !imageUrl) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-[90vw] h-[90vh] max-w-7xl max-h-[95vh] p-2 sm:p-4 transform transition-transform duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={imageUrl}
                    alt={altText}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-xl shadow-2xl"
                    unoptimized
                />

                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 m-2 text-white text-3xl font-bold bg-gray-900 bg-opacity-70 hover:bg-opacity-100 rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 z-50"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};

// ======================================================================
// === 2. KOMPONENTA FILTRŮ ===
// ======================================================================
interface FilterProps {
    filters: Filters;
    onFilterChange: (newFilters: Partial<Filters>) => void;
    onSearch: () => void;
    isLoading: boolean;
}

const JizdniRadFilters: React.FC<FilterProps> = ({ filters, onFilterChange, onSearch, isLoading }) => {
    return (
        <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 rounded-xl shadow-lg mb-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-zinc-50">Filtrovat Jízdní Řády</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label htmlFor="transportType" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Typ Dopravy</label>
                    <select
                        id="transportType"
                        value={filters.transport_type}
                        onChange={(e) => onFilterChange({ transport_type: e.target.value as Filters['transport_type'] })}
                        className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 dark:bg-zinc-700 dark:text-zinc-100 focus:border-blue-500 focus:ring-blue-500 transition"
                        disabled={isLoading}
                    >
                        <option value="all">Všechny</option>
                        <option value="autobus">Autobus 🚌</option>
                        <option value="tramvaj">Tramvaj 🚋</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="dayType" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Dny Provozu</label>
                    <select
                        id="dayType"
                        value={filters.day_type}
                        onChange={(e) => onFilterChange({ day_type: e.target.value as Filters['day_type'] })}
                        className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 dark:bg-zinc-700 dark:text-zinc-100 focus:border-blue-500 focus:ring-blue-500 transition"
                        disabled={isLoading}
                    >
                        <option value="all">Všechny</option>
                        <option value="pracovni">Pracovní dny</option>
                        <option value="vikend">Víkend</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="lineNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Linky</label>
                    <input
                        type="text"
                        id="lineNumber"
                        value={filters.course_number}
                        onChange={(e) => onFilterChange({ course_number: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 dark:bg-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500 transition"
                        placeholder="3"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="courseNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Kurzu</label>
                    <input
                        type="text"
                        id="courseNumber"
                        value={filters.line_number}
                        onChange={(e) => onFilterChange({ line_number: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 dark:bg-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500 transition"
                        placeholder="101"
                        disabled={isLoading}
                    />
                </div>
            </div>
            <button
                onClick={onSearch}
                disabled={isLoading}
                className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 font-bold transition"
            >
                {isLoading ? 'Hledám...' : 'Použít filtry'}
            </button>
        </div>
    );
};


// ======================================================================
// === 3. KOMPONENTA MODALU PRO EDITACI (S INTEGRACÍ KOMPRESE) ===
// ======================================================================
interface EditTimetableModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: GroupedTimetable | null;
    onSaveSuccess: () => void;
}

const EditTimetableModal: React.FC<EditTimetableModalProps> = ({ isOpen, onClose, initialData, onSaveSuccess }) => {

    const [formData, setFormData] = useState({
        course_number: '',
        line_number: '',
        transport_type: 'autobus' as 'autobus' | 'tramvaj',
        day_type: 'pracovni' as 'pracovni' | 'vikend',
    });

    const [fileRanni, setFileRanni] = useState<File | null>(null);
    const [fileOdpoledni, setFileOdpoledni] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                course_number: initialData.course_number,
                line_number: initialData.line_number,
                transport_type: initialData.transport_type,
                day_type: initialData.day_type,
            });
            setFileRanni(null);
            setFileOdpoledni(null);
            setStatusMessage(null);
        }
    }, [initialData]);

    if (!isOpen || !initialData) return null;

    // 🛠️ POMOCNÁ FUNKCE PRO KOMPRESI OBRÁZKU PŘED NAHRÁNÍM
    const compressImageIfNeeded = (file: File): Promise<Blob | File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                return resolve(file); // Pokud to není fotka, nekomprimujeme (např. pro případná PDF)
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

                    const MAX_SIZE = 1600; // Maximální rozlišení delší strany
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

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/jpeg',
                        0.8 // Komprese na 80 % kvality
                    );
                };
            };
        });
    };

    // Upload returns a private path; metadata is saved once for both parts.

    const uploadFile = async (
        file: File
    ) => {
        const processedBlobOrFile = await compressImageIfNeeded(file);

        const isImage = file.type.startsWith('image/');
        if (!isImage && file.type !== 'application/pdf') {
            throw new Error('Vyberte obrázek nebo PDF.');
        }

        const contentType = isImage ? 'image/jpeg' : file.type;

        const filePath = await uploadTimetableFile(processedBlobOrFile, contentType);

        return filePath;
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatusMessage(null);

        try {
            const target = {
                course_number: formData.course_number.trim(),
                line_number: formData.line_number.trim(),
                transport_type: formData.transport_type,
                day_type: formData.day_type,
            };
            if (!target.course_number || !target.line_number) {
                throw new Error('Číslo Linky a Kurzu nesmí být prázdné.');
            }
            // Validate all existing parts before uploading either replacement.
            for (const old of [initialData.files.ranni, initialData.files.odpoledni]) {
                if (old && (!Number.isSafeInteger(old.revision) || old.revision < 0)) {
                    throw new Error('Chybí platná revize záznamu. Obnovte seznam jízdních řádů.');
                }
                if (old && !old.image_path) {
                    throw new Error('Starší jízdní řád vyžaduje převod do privátního úložiště.');
                }
            }
            const records = [];
            for (const part of ['ranni', 'odpoledni'] as const) {
                const old = initialData.files[part];
                const file = part === 'ranni' ? fileRanni : fileOdpoledni;
                if (!old && !file) continue;
                const imagePath = file ? await uploadFile(file) : old!.image_path;
                records.push({
                    ...target,
                    part_of_day: part,
                    image_path: imagePath,
                    image_url: null,
                    keywords: old?.keywords ?? null,
                    ...(old ? { id: old.id, expected_revision: old.revision } : {}),
                });
            }
            const { data, error: dbError } = await supabase.rpc('save_jizdni_rad_with_cleanup', {
                p_records: records,
            });
            if (dbError) {
                throw new Error((dbError.code === 'PT409' || dbError.code === '40001')
                    ? 'Jízdní řád mezitím někdo změnil. Zavřete úpravu a obnovte seznam.'
                    : dbError.code === '23505'
                        ? 'Jízdní řád s těmito údaji již existuje.'
                        : `Uložení se nepodařilo potvrdit: ${dbError.message}`);
            }
            if (!Array.isArray(data) || data.length !== records.length) {
                throw new Error('Výsledek uložení se nepodařilo potvrdit. Před opakováním obnovte seznam.');
            }
            setStatusMessage('Změny byly úspěšně uloženy a soubory zkomprimovány!');
            onSaveSuccess();
            setTimeout(onClose, 2000);

        } catch (error: unknown) {
            console.error('Chyba při ukládání:', error);
            const message = error instanceof Error ? error.message : 'Uložení se nepodařilo potvrdit.';
            const recovery = message.toLowerCase().includes('obnovte seznam')
                ? '' : ' Před dalším pokusem zavřete úpravu a obnovte seznam.';
            const uploadNote = fileRanni || fileOdpoledni ? ' Nové soubory zůstaly zachovány.' : '';
            setStatusMessage(`CHYBA: ${message}${recovery}${uploadNote}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-timetable-title"
                className="bg-white dark:bg-zinc-800 p-6 sm:p-8 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="edit-timetable-title" className="text-2xl font-bold mb-6 text-blue-600 dark:text-blue-300">
                    Editovat Jízdní Řád: {initialData.course_number}/{initialData.line_number}
                </h2>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-line-number" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Linky:</label>
                            <input
                                id="edit-line-number"
                                type="text"
                                value={formData.course_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, course_number: e.target.value.trim() }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                                disabled={isSaving}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-course-number" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Kurzu:</label>
                            <input
                                id="edit-course-number"
                                type="text"
                                value={formData.line_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, line_number: e.target.value.trim() }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                                disabled={isSaving}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-transport-type" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Typ Dopravy:</label>
                            <select
                                id="edit-transport-type"
                                value={formData.transport_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, transport_type: e.target.value as 'autobus' | 'tramvaj' }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                                disabled={isSaving}
                            >
                                <option value="autobus">Autobus 🚌</option>
                                <option value="tramvaj">Tramvaj 🚋</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="edit-day-type" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Dny Provozu:</label>
                            <select
                                id="edit-day-type"
                                value={formData.day_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, day_type: e.target.value as 'pracovni' | 'vikend' }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                                disabled={isSaving}
                            >
                                <option value="pracovni">Pracovní dny</option>
                                <option value="vikend">Víkend</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-lg font-semibold text-gray-800 dark:text-zinc-50 border-t pt-4 mt-4">Nahrát nové soubory (automatická komprese)</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-ranni-file" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center mb-1">
                                <Upload size={16} className="mr-1" /> Ranní JŘ ({initialData.files.ranni ? 'Nahrazeno' : 'Vytvořeno'}):
                            </label>
                            <input
                                id="edit-ranni-file"
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={(e) => setFileRanni(e.target.files ? e.target.files[0] : null)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-800 dark:file:text-blue-100"
                                disabled={isSaving}
                            />
                            {initialData.files.ranni && !fileRanni && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Stávající soubor bude použit.</p>
                            )}
                            {fileRanni && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Nový obrázek připraven ke kompresi.</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="edit-odpoledni-file" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center mb-1">
                                <Upload size={16} className="mr-1" /> Odpolední JŘ ({initialData.files.odpoledni ? 'Nahrazeno' : 'Vytvořeno'}):
                            </label>
                            <input
                                id="edit-odpoledni-file"
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={(e) => setFileOdpoledni(e.target.files ? e.target.files[0] : null)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-800 dark:file:text-blue-100"
                                disabled={isSaving}
                            />
                            {initialData.files.odpoledni && !fileOdpoledni && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Stávající soubor bude použit.</p>
                            )}
                            {fileOdpoledni && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Nový obrázek připraven ke kompresi.</p>
                            )}
                        </div>
                    </div>
                </div>

                {statusMessage && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${statusMessage.startsWith('CHYBA') ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                        {statusMessage}
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 transition disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Zavřít
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
                        disabled={isSaving || (!fileRanni && !fileOdpoledni &&
                            formData.course_number === initialData.course_number &&
                            formData.line_number === initialData.line_number &&
                            formData.transport_type === initialData.transport_type &&
                            formData.day_type === initialData.day_type
                        )}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin mr-2" /> Komprimuji a ukládám...
                            </>
                        ) : 'Uložit Změny'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ======================================================================
// === 4. HLAVNÍ KOMPONENTA JÍZDNÍCH ŘÁDŮ ===
// ======================================================================
const JizdniRadyPage = () => {
    const { user, isLoading: isAuthLoading, status, role } = useAuth();
    const isAdmin = role === 'admin';

    const [visibilityReady, setVisibilityReady] = useState(false);
    const [visibilityBusy, setVisibilityBusy] = useState(false);
    const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);
    const [jizdniRady, setJizdniRady] = useState<GroupedTimetable[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedLine, setSelectedLine] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
    const [detail, setDetail] = useState<GroupedTimetable | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [detailAttempt, setDetailAttempt] = useState(0);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const [modalAltText, setModalAltText] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<GroupedTimetable | null>(null);

    const initialFilters: Filters = {
        transport_type: 'all',
        day_type: 'all',
        course_number: '',
        line_number: '',
    };

    const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

    const fetchJizdniRady = useCallback(async () => {
        setIsLoadingData(true);
        setError(null);

        let query = supabase
            .from('jizdni_rady')
            .select('*')
            .order('course_number', { ascending: true })
            .order('line_number', { ascending: true });

        if (appliedFilters.transport_type !== 'all') {
            query = query.eq('transport_type', appliedFilters.transport_type);
        }
        if (appliedFilters.day_type !== 'all') {
            query = query.eq('day_type', appliedFilters.day_type);
        }
        if (appliedFilters.course_number) {
            query = query.ilike('course_number', `%${appliedFilters.course_number}%`);
        }
        if (appliedFilters.line_number) {
            query = query.ilike('line_number', `%${appliedFilters.line_number}%`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            setError('Nepodařilo se načíst jízdní řády. Zkontrolujte RLS politiky.');
            setJizdniRady([]);

        } else {
            const records = (data ?? []) as JizdniRad[];
            const visibility = new Map<string, boolean>();
            if (isAdmin) {
                // Fetch every visibility setting, including courses beyond one API page.
                for (let offset = 0; ; offset += 500) {
                    const result = await supabase.from('timetable_course_visibility')
                        .select('transport_type,course_number,line_number,day_type,is_active')
                        .order('transport_type').order('course_number').order('line_number').order('day_type')
                        .range(offset, offset + 499);
                    if (result.error) {
                        visibility.clear();
                        setVisibilityReady(false);
                        break;
                    }
                    for (const row of result.data ?? []) {
                        visibility.set(JSON.stringify([row.transport_type, row.course_number, row.line_number, row.day_type]), row.is_active);
                    }
                    if ((result.data?.length ?? 0) < 500) {
                        setVisibilityReady(true);
                        break;
                    }
                }
            }


            const groupedData = records.reduce((acc, current) => {

                const key = JSON.stringify([current.transport_type, current.course_number, current.line_number, current.day_type]);
                if (!acc[key]) {
                    acc[key] = {
                        is_active: visibility.get(key) ?? true,
                        course_number: current.course_number,
                        line_number: current.line_number,
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

            const finalDisplayData = Object.values(groupedData).sort((a, b) =>
                a.course_number.localeCompare(b.course_number) || a.line_number.localeCompare(b.line_number)
            );
            setJizdniRady(finalDisplayData);
        }
        setIsLoadingData(false);
    }, [appliedFilters, isAdmin]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchJizdniRady();
        }
    }, [isAuthLoading, user, fetchJizdniRady]);

    // Metadata navigation never signs or renders files. Only the open course does.
    const typeKey = (row: GroupedTimetable) => `${row.transport_type}:${row.day_type}`;
    const typeLabel = (row: GroupedTimetable) =>
        `${row.transport_type === 'autobus' ? 'Autobus' : 'Tramvaj'} · ${row.day_type === 'pracovni' ? 'Pracovní dny' : 'Víkend'}`;
    const course = jizdniRady.find(row => typeKey(row) === selectedType &&
        row.course_number === selectedLine && row.line_number === selectedCourse);
    const currentDetail = detail && typeKey(detail) === selectedType && detail.course_number === selectedLine && detail.line_number === selectedCourse ? detail : null;
    const types = Array.from(new Map(jizdniRady.map(row => [typeKey(row), row])).values());
    const typeRows = jizdniRady.filter(row => typeKey(row) === selectedType);
    const lines = Array.from(new Set(typeRows.map(row => row.course_number)))
        .sort((a, b) => a.localeCompare(b, 'cs', { numeric: true }));
    const courses = typeRows.filter(row => row.course_number === selectedLine)
        .sort((a, b) => a.line_number.localeCompare(b.line_number, 'cs', { numeric: true }));

    useEffect(() => {
        let cancelled = false;
        setDetail(null);
        if (!course || isLoadingData || !user || status !== 'approved') {
            setIsLoadingDetail(false);
            return;
        }
        setIsLoadingDetail(true);
        const sign = async (record: JizdniRad | null): Promise<JizdniRad | null> => {
            if (!record) return null;
            const path = resolvePrivateStoragePath(record.image_path || record.image_url || '', 'jizdni-rady');
            try {
                return { ...record, signed_url: path ? await getPrivateFileUrl('jizdni-rady', path, 3600) : null };
            } catch {
                return { ...record, signed_url: null };
            }
        };
        void Promise.all([sign(course.files.ranni), sign(course.files.odpoledni)])
            .then(([ranni, odpoledni]) => {
                if (!cancelled) {
                    setDetail({ ...course, files: { ranni, odpoledni } });
                    setIsLoadingDetail(false);
                }
            });
        return () => { cancelled = true; };
    }, [course, isLoadingData, user, status, detailAttempt]);

    const toggleCourseVisibility = async (row: GroupedTimetable) => {
        if (!isAdmin || !visibilityReady || visibilityBusy) return;
        setVisibilityBusy(true);
        setVisibilityMessage(null);
        try {
            const { error: updateError } = await supabase.rpc('set_timetable_course_visibility', {
                p_line_number: row.line_number,
                p_course_number: row.course_number,
                p_transport_type: row.transport_type,
                p_day_type: row.day_type,
                p_is_active: !row.is_active,
                p_expected_active: row.is_active,
            });
            if (updateError) {
                setVisibilityMessage(updateError.code === '40001'
                    ? 'Kurz mezitím někdo změnil. Seznam byl obnoven; zkontrolujte jeho stav.'
                    : 'Viditelnost se nepodařilo změnit. Zkuste to znovu.');
            } else {
                setVisibilityMessage(row.is_active
                    ? 'Celý kurz je vypnutý pro uživatele. Ranní i odpolední tabulka zůstávají uložené.'
                    : 'Celý kurz je znovu viditelný pro uživatele.');
            }
            await fetchJizdniRady();
        } catch {
            setVisibilityMessage('Viditelnost se nepodařilo změnit. Zkuste to znovu.');
        } finally {
            setVisibilityBusy(false);
        }
    };

    const openEditModal = useCallback((data: GroupedTimetable) => {
        setEditData(data);
        setIsEditModalOpen(true);
    }, []);

    const closeEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditData(null);
    }, []);

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



    const handleDelete = useCallback(async (jizdniRad: GroupedTimetable) => {
        if (!window.confirm(
            `Opravdu chcete smazat jízdní řád ${jizdniRad.course_number}/${jizdniRad.line_number} (${jizdniRad.day_type})?`
        )) {
            return;
        }

        setIsLoadingData(true);
        setError(null);

        try {
            const filesToDelete = [
                jizdniRad.files.ranni,
                jizdniRad.files.odpoledni,
            ].filter((file): file is JizdniRad => file != null);

            if (filesToDelete.length === 0) {
                throw new Error('Nebyly nalezeny žádné záznamy k odstranění.');
            }

            const idsToDelete = [...new Set(filesToDelete.map(file => file.id))];

            if (idsToDelete.length !== filesToDelete.length) {
                throw new Error('Byly nalezeny duplicitní identifikátory záznamů.');
            }

            // Ověření aktuálního stavu databáze.
            const { data: currentRows, error: readError } = await supabase
                .from('jizdni_rady')
                .select('id, image_path, image_url')
                .in('id', idsToDelete);

            if (readError) {
                throw new Error(`Nelze ověřit záznamy: ${readError.message}`);
            }

            if (!currentRows || currentRows.length !== idsToDelete.length) {
                throw new Error(
                    'Počet záznamů v databázi neodpovídá očekávání. Mazání bylo zastaveno.'
                );
            }

            currentRows.forEach(row => {
                const original = filesToDelete.find(
                    file => String(file.id) === String(row.id)
                );

                if (!original ||
                    original.image_path !== row.image_path ||
                    original.image_url !== row.image_url) {
                    throw new Error(
                        `Záznam ${row.id} byl mezitím změněn. Obnovte stránku.`
                    );
                }

                const path = resolvePrivateStoragePath(
                    row.image_path || row.image_url || '',
                    'jizdni-rady'
                );

                if (!path) {
                    throw new Error(
                        `Nelze určit cestu souboru záznamu ${row.id}.`
                    );
                }

                // Rezervace cesty pro budoucí fyzické smazání.
            });

            // Atomické databázové mazání přes zabezpečenou RPC.
            // RPC současně rezervuje původní cesty v cleanup frontě.
            // Fyzické mazání Storage provede až budoucí serverový worker.

            const expectedRecords = filesToDelete.map(file => ({
                id: file.id,
                image_path: file.image_path ?? null,
                image_url: file.image_url ?? null,
            }));

            const { data: deletedCount, error: dbError } = await supabase.rpc(
                'delete_jizdni_rady_with_cleanup',
                {
                    p_expected: expectedRecords,
                }
            );

            if (dbError) {
                throw new Error(
                    (dbError.code === 'PT409' || dbError.code === '40001')
                        ? 'Jízdní řád mezitím někdo změnil. Obnovte seznam před dalším mazáním.'
                        : `Mazání jízdního řádu selhalo: ${dbError.message}`
                );
            }

            if (
                typeof deletedCount !== 'number' ||
                deletedCount !== idsToDelete.length
            ) {
                throw new Error(
                    'Databáze nepotvrdila očekávaný počet odstraněných záznamů. ' +
                    'Je nutná kontrola konzistence dat.'
                );
            }

            await fetchJizdniRady();
            alert('Jízdní řád byl úspěšně smazán!');

        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Neznámá chyba';

            console.error('Chyba při mazání jízdního řádu:', error);
            setError(`Chyba při mazání: ${message}`);
        } finally {
            setIsLoadingData(false);
        }
    }, [fetchJizdniRady]);



    if (isAuthLoading || isLoadingData) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <GridLoader color="#0066ff" size={15} />
            </div>
        );
    }
    if (error) {
        return (
            <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded mx-auto max-w-4xl mt-8">
                <h1 className="font-bold">Chyba:</h1> {error}
            </div>
        );
    }
    if (!user || status !== 'approved') {
        return (
            <div className="p-8 text-center bg-white dark:bg-zinc-800 rounded-lg shadow-xl mx-auto max-w-md mt-10">
                <h1 className="text-2xl text-red-600 dark:text-red-400 font-bold">Přístup odepřen</h1>
                <p className="text-gray-600 dark:text-zinc-400 mt-2">Musíte být schválený uživatel pro přístup k jízdním řádům.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8 text-gray-800 dark:text-zinc-50 border-b-2 border-blue-700 pb-2 flex items-center">
                    <span className='text-2xl'>Jízdní Řády</span> {isAdmin && <span className="text-2xl text-red-500 ml-2">(ADMIN)</span>}
                </h1>

                <JizdniRadFilters
                    filters={draftFilters}
                    onFilterChange={(newFilters: Partial<Filters>) => setDraftFilters(prev => ({ ...prev, ...newFilters }))}
                    onSearch={() => {
                        setSelectedType(null);
                        setSelectedLine(null);
                        setSelectedCourse(null);
                        setAppliedFilters({ ...draftFilters });
                    }}
                    isLoading={isLoadingData}
                />

                {isAdmin && !visibilityReady && <p role="status" className="mb-4 text-amber-700 dark:text-amber-300">Ovládání viditelnosti kurzů zatím není dostupné.</p>}
                {isAdmin && visibilityMessage && <p role="status" className="mb-4">{visibilityMessage}</p>}
                <nav aria-label="Výběr jízdního řádu" className="flex flex-wrap gap-3 mb-6 text-blue-700 dark:text-blue-300">
                    <button onClick={() => { setSelectedType(null); setSelectedLine(null); setSelectedCourse(null); }}>Typy kurzů</button>
                    {selectedType && <><span>›</span><button onClick={() => { setSelectedLine(null); setSelectedCourse(null); }}>{types.find(row => typeKey(row) === selectedType) ? typeLabel(types.find(row => typeKey(row) === selectedType)!) : 'Typ kurzu'}</button></>}
                    {selectedLine && <><span>›</span><button onClick={() => setSelectedCourse(null)}>Linka {selectedLine}</button></>}
                    {selectedCourse && <><span>›</span><span aria-current="page">Kurz {selectedCourse}</span></>}
                </nav>
                {!selectedCourse && jizdniRady.length > 0 && <h2 className="text-xl font-semibold mb-4">{!selectedType ? 'Vyberte typ kurzu' : !selectedLine ? 'Vyberte linku' : 'Vyberte kurz'}</h2>}
                {!selectedCourse && jizdniRady.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {!selectedType ? types.map(row => <button key={typeKey(row)} className="p-6 rounded-xl bg-white dark:bg-zinc-800 shadow text-left" onClick={() => setSelectedType(typeKey(row))}>{typeLabel(row)}</button>) :
                        !selectedLine ? lines.map(line => <button key={line} className="p-6 rounded-xl bg-white dark:bg-zinc-800 shadow text-left" onClick={() => setSelectedLine(line)}>Linka {line}</button>) :
                        courses.map(row => <button key={row.line_number} className="p-6 rounded-xl bg-white dark:bg-zinc-800 shadow text-left" onClick={() => setSelectedCourse(row.line_number)}>Kurz {row.line_number}{isAdmin && visibilityReady && <span className="block mt-2 text-sm">{row.is_active ? 'Aktivní' : 'Neaktivní · pouze pro administrátora'}</span>}</button>)}
                </div>}
                {selectedCourse && isLoadingDetail && <p role="status" className="mb-6">Načítání obrázků kurzu…</p>}
                {selectedCourse && !isLoadingDetail && !course && <p>Vybraný kurz již není dostupný. Vyberte jiný kurz.</p>}
                {selectedCourse && currentDetail && <button className="mb-4 text-blue-700 dark:text-blue-300" onClick={() => { setDetail(null); setDetailAttempt(value => value + 1); }}>Obnovit obrázky</button>}

                {jizdniRady.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg text-center text-gray-600 dark:text-zinc-400">
                        Nebyly nalezeny žádné jízdní řády odpovídající vašim kritériím.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {(selectedCourse && !isLoadingDetail && currentDetail ? [currentDetail] : []).map((jizdniRad) => (
                            <div
                                key={`${jizdniRad.transport_type}-${jizdniRad.course_number}-${jizdniRad.line_number}-${jizdniRad.day_type}`}
                                className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col relative"
                            >

                                {isAdmin && (
                                    <div className="absolute top-0 right-0 p-2 z-10 space-x-2">
                                        <button
                                            onClick={() => openEditModal(jizdniRad)}
                                            className="p-1.5 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition shadow-md"
                                            title="Editovat jízdní řád"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(jizdniRad)}
                                            className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow-md"
                                            title="Smazat jízdní řád"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/50 border-b border-gray-200 dark:border-zinc-700">
                                    {isAdmin && <div className="mb-3 pr-20">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-label="Viditelnost celého kurzu pro uživatele"
                                            aria-checked={visibilityReady && jizdniRad.is_active}
                                            disabled={!visibilityReady || visibilityBusy}
                                            onClick={() => void toggleCourseVisibility(jizdniRad)}
                                            className="rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-600 disabled:opacity-50"
                                        >{!visibilityReady ? 'Viditelnost není dostupná' : visibilityBusy ? 'Ukládání…' : jizdniRad.is_active ? 'Aktivní · Vypnout celý kurz' : 'Neaktivní · Zapnout celý kurz'}</button>
                                        <p className="text-sm mt-2">Platí společně pro ranní i odpolední tabulku.</p>
                                    </div>}
                                    <h3 className="text-2xl font-extrabold mb-1 text-blue-700 dark:text-blue-300">{jizdniRad.course_number}/{jizdniRad.line_number}</h3>
                                    <p className="text-gray-600 dark:text-zinc-400 text-sm">
                                        <span className="font-semibold">Dny:</span> {jizdniRad.day_type === 'pracovni' ? 'Pracovní dny' : 'Víkend'}
                                    </p>
                                    <p className="text-gray-600 dark:text-zinc-400 text-sm">
                                        <span className="font-semibold">Typ:</span> {jizdniRad.transport_type === 'autobus' ? 'Autobus 🚌' : 'Tramvaj 🚋'}
                                    </p>
                                </div>

                                <div className="p-4 flex-grow">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg text-gray-800 dark:text-zinc-50 mb-2 text-center">Ranní</h4>

                                            {jizdniRad.files.ranni?.signed_url ? (
                                                <div
                                                    onClick={() => {
                                                        const url = jizdniRad.files.ranni?.signed_url;

                                                        if (url) {
                                                            openModal(
                                                                url,
                                                                `JŘ Ranní ${jizdniRad.course_number}/${jizdniRad.line_number}`
                                                            );
                                                        }
                                                    }}
                                                    className="block border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                                                >
                                                    <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-zinc-700">
                                                        <Image
                                                            src={jizdniRad.files.ranni.signed_url}
                                                            alt={`Náhled Ranní JŘ Linka ${jizdniRad.course_number}`}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, 50vw"
                                                            className="rounded-lg object-contain"
                                                            loading="lazy"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600 text-center p-4">
                                                    {jizdniRad.files.ranni
                                                        ? 'Fotografii se nepodařilo načíst'
                                                        : 'Není nahráno'}
                                                </div>
                                            )}

                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg text-gray-800 dark:text-zinc-50 mb-2 text-center mt-4 sm:mt-0">Odpolední</h4>

                                            {jizdniRad.files.odpoledni?.signed_url ? (
                                                <div
                                                    onClick={() => {
                                                        const url = jizdniRad.files.odpoledni?.signed_url;

                                                        if (url) {
                                                            openModal(
                                                                url,
                                                                `JŘ Odpolední ${jizdniRad.course_number}/${jizdniRad.line_number}`
                                                            );
                                                        }
                                                    }}
                                                    className="block border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                                                >
                                                    <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-zinc-700">
                                                        <Image
                                                            src={jizdniRad.files.odpoledni.signed_url}
                                                            alt={`Náhled Odpolední JŘ Linka ${jizdniRad.course_number}`}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, 50vw"
                                                            className="rounded-lg object-contain"
                                                            loading="lazy"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600 text-center p-4">
                                                    {jizdniRad.files.odpoledni
                                                        ? 'Fotografii se nepodařilo načíst'
                                                        : 'Není nahráno'}
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ImageModal
                isOpen={isModalOpen}
                imageUrl={modalImageUrl}
                onClose={closeModal}
                altText={modalAltText}
            />

            <EditTimetableModal
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                initialData={editData}
                onSaveSuccess={fetchJizdniRady}
            />
        </div>
    );
};

export default JizdniRadyPage;