// src/app/user-portal/tabulky/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import Image from 'next/image';
import { Edit, Trash2, Loader2, Upload } from 'lucide-react';

// --- TYPY DAT Z DATABÁZE ---
interface JizdniRad {
    id: string;
    line_number: string;
    course_number: string;
    transport_type: 'autobus' | 'tramvaj';
    day_type: 'pracovni' | 'vikend';
    part_of_day: 'ranni' | 'odpoledni';
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

interface Filters {
    transport_type: 'all' | 'autobus' | 'tramvaj';
    day_type: 'all' | 'pracovni' | 'vikend';
    line_number: string;
    course_number: string;
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
                    <label htmlFor="lineNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Kurzu</label>
                    <input
                        type="text"
                        id="lineNumber"
                        value={filters.line_number}
                        onChange={(e) => onFilterChange({ line_number: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        className="mt-1 block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 dark:bg-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500 transition"
                        placeholder="3"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="courseNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Linky</label>
                    <input
                        type="text"
                        id="courseNumber"
                        value={filters.course_number}
                        onChange={(e) => onFilterChange({ course_number: e.target.value })}
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
        line_number: '',
        course_number: '',
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
                line_number: initialData.line_number,
                course_number: initialData.course_number,
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

    // Funkce pro nahrání souboru a získání veřejné URL
    const uploadFile = async (file: File, part: 'ranni' | 'odpoledni', oldRecord: JizdniRad | null) => {
        // 1. Provedeme kompresi souboru
        const processedBlobOrFile = await compressImageIfNeeded(file);

        // Pokud se jedná o obrázek, uložíme ho s příponou .jpg kvůli provedené kompresi
        const isImage = file.type.startsWith('image/');
        const fileExt = isImage ? 'jpg' : file.name.split('.').pop();
        const contentType = isImage ? 'image/jpeg' : file.type;

        const fileName = `${formData.line_number}_${formData.course_number}_${formData.day_type}_${part}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Nahrání zkomprimovaného souboru do Storage (přepíše stávající)
        const { error: uploadError } = await supabase.storage
            .from('jizdni-rady')
            .upload(filePath, processedBlobOrFile, {
                cacheControl: '3600',
                upsert: true,
                contentType: contentType
            });

        if (uploadError) {
            throw new Error(`Chyba při nahrávání souboru ${part}: ${uploadError.message}`);
        }

        // 3. Získání veřejné URL
        const { data: publicUrlData } = supabase.storage
            .from('jizdni-rady')
            .getPublicUrl(filePath);

        // 4. Aktualizace/Vložení záznamu do tabulky jizdni_rady
        const newRecordData = {
            line_number: formData.line_number,
            course_number: formData.course_number,
            transport_type: formData.transport_type,
            day_type: formData.day_type,
            part_of_day: part,
            image_url: publicUrlData.publicUrl,
        };

        if (oldRecord) {
            const { error: updateError } = await supabase
                .from('jizdni_rady')
                .update(newRecordData)
                .eq('id', oldRecord.id);

            if (updateError) throw new Error(`Chyba při aktualizaci DB záznamu ${part}: ${updateError.message}`);
        } else {
            const { error: insertError } = await supabase
                .from('jizdni_rady')
                .insert(newRecordData);

            if (insertError) throw new Error(`Chyba při vkládání DB záznamu ${part}: ${insertError.message}`);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatusMessage(null);

        try {
            if (!formData.line_number || !formData.course_number) {
                throw new Error('Číslo Linky a Kurzu nesmí být prázdné.');
            }

            // --- Logika pro RANNÍ část ---
            if (fileRanni) {
                await uploadFile(fileRanni, 'ranni', initialData.files.ranni);
            } else if (initialData.files.ranni && (
                initialData.files.ranni.line_number !== formData.line_number ||
                initialData.files.ranni.course_number !== formData.course_number ||
                initialData.files.ranni.transport_type !== formData.transport_type ||
                initialData.files.ranni.day_type !== formData.day_type
            )) {
                const { error: updateError } = await supabase
                    .from('jizdni_rady')
                    .update({
                        line_number: formData.line_number,
                        course_number: formData.course_number,
                        transport_type: formData.transport_type,
                        day_type: formData.day_type,
                    })
                    .eq('id', initialData.files.ranni.id);

                if (updateError) throw new Error(`Chyba při aktualizaci RANNÍ DB metadat: ${updateError.message}`);
            }

            // --- Logika pro ODPOLEDNÍ část ---
            if (fileOdpoledni) {
                await uploadFile(fileOdpoledni, 'odpoledni', initialData.files.odpoledni);
            } else if (initialData.files.odpoledni && (
                initialData.files.odpoledni.line_number !== formData.line_number ||
                initialData.files.odpoledni.course_number !== formData.course_number ||
                initialData.files.odpoledni.transport_type !== formData.transport_type ||
                initialData.files.odpoledni.day_type !== formData.day_type
            )) {
                const { error: updateError } = await supabase
                    .from('jizdni_rady')
                    .update({
                        line_number: formData.line_number,
                        course_number: formData.course_number,
                        transport_type: formData.transport_type,
                        day_type: formData.day_type,
                    })
                    .eq('id', initialData.files.odpoledni.id);

                if (updateError) throw new Error(`Chyba při aktualizaci ODPOLEDNÍ DB metadat: ${updateError.message}`);
            }

            setStatusMessage('Změny byly úspěšně uloženy a soubory zkomprimovány!');
            onSaveSuccess();
            setTimeout(onClose, 2000);

        } catch (error: any) {
            console.error('Chyba při ukládání:', error);
            setStatusMessage(`CHYBA: ${error.message}`);
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
                className="bg-white dark:bg-zinc-800 p-6 sm:p-8 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-6 text-blue-600 dark:text-blue-300">
                    Editovat Jízdní Řád: {initialData.line_number}/{initialData.course_number}
                </h2>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Kurzu:</label>
                            <input
                                type="text"
                                value={formData.line_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, line_number: e.target.value.trim() }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                                disabled={isSaving}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Číslo Linky:</label>
                            <input
                                type="text"
                                value={formData.course_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, course_number: e.target.value.trim() }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100"
                                disabled={isSaving}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Typ Dopravy:</label>
                            <select
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Dny Provozu:</label>
                            <select
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center mb-1">
                                <Upload size={16} className="mr-1" /> Ranní JŘ ({initialData.files.ranni ? 'Nahrazeno' : 'Vytvořeno'}):
                            </label>
                            <input
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center mb-1">
                                <Upload size={16} className="mr-1" /> Odpolední JŘ ({initialData.files.odpoledni ? 'Nahrazeno' : 'Vytvořeno'}):
                            </label>
                            <input
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
                            formData.line_number === initialData.line_number &&
                            formData.course_number === initialData.course_number &&
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

    const [jizdniRady, setJizdniRady] = useState<GroupedTimetable[]>([]);
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
        line_number: '',
        course_number: '',
    };

    const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

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
            const groupedData = (data as JizdniRad[]).reduce((acc, current) => {
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
        if (!window.confirm(`Opravdu chcete smazat jízdní řád ${jizdniRad.line_number}/${jizdniRad.course_number} (${jizdniRad.day_type})? Tato akce smaže záznamy z DB i soubory ze Storage.`)) {
            return;
        }

        setIsLoadingData(true);
        setError(null);

        try {
            const filesToDelete: { id: string, image_url: string }[] = [];

            if (jizdniRad.files.ranni) {
                filesToDelete.push({ id: jizdniRad.files.ranni.id, image_url: jizdniRad.files.ranni.image_url });
            }
            if (jizdniRad.files.odpoledni) {
                filesToDelete.push({ id: jizdniRad.files.odpoledni.id, image_url: jizdniRad.files.odpoledni.image_url });
            }

            for (const file of filesToDelete) {
                const urlParts = file.image_url.split('/storage/v1/object/public/jizdni-rady/');
                if (urlParts.length === 2) {
                    const filePath = urlParts[1];
                    const { error: storageError } = await supabase.storage
                        .from('jizdni-rady')
                        .remove([filePath]);
                    if (storageError) console.error(`Chyba při mazání souboru ${filePath}:`, storageError.message);
                }
            }

            const idsToDelete = filesToDelete.map(f => f.id);
            if (idsToDelete.length > 0) {
                const { error: dbError } = await supabase
                    .from('jizdni_rady')
                    .delete()
                    .in('id', idsToDelete);

                if (dbError) throw new Error(`Chyba při mazání záznamů v DB: ${dbError.message}`);
            }

            alert('Jízdní řád byl úspěšně smazán!');
            await fetchJizdniRady();

        } catch (e: any) {
            setError(`Chyba při mazání: ${e.message}`);
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
                    onSearch={() => setAppliedFilters(draftFilters)}
                    isLoading={isLoadingData}
                />

                {jizdniRady.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg text-center text-gray-600 dark:text-zinc-400">
                        Nebyly nalezeny žádné jízdní řády odpovídající vašim kritériím.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {jizdniRady.map((jizdniRad) => (
                            <div
                                key={`${jizdniRad.line_number}-${jizdniRad.course_number}-${jizdniRad.day_type}`}
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
                                    <h3 className="text-2xl font-extrabold mb-1 text-blue-700 dark:text-blue-300">{jizdniRad.line_number}/{jizdniRad.course_number}</h3>
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
                                            {jizdniRad.files.ranni ? (
                                                <div
                                                    onClick={() => openModal(jizdniRad.files.ranni!.image_url, `JŘ Ranní ${jizdniRad.line_number}/${jizdniRad.course_number}`)}
                                                    className="block border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                                                >
                                                    <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-zinc-700">
                                                        <Image
                                                            src={jizdniRad.files.ranni.image_url}
                                                            alt={`Náhled Ranní JŘ Linka ${jizdniRad.line_number}`}
                                                            layout="fill"
                                                            objectFit="contain"
                                                            className="rounded-lg" loading="lazy"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600">
                                                    Není nahráno
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg text-gray-800 dark:text-zinc-50 mb-2 text-center mt-4 sm:mt-0">Odpolední</h4>
                                            {jizdniRad.files.odpoledni ? (
                                                <div
                                                    onClick={() => openModal(jizdniRad.files.odpoledni!.image_url, `JŘ Odpolední ${jizdniRad.line_number}/${jizdniRad.course_number}`)}
                                                    className="block border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                                                >
                                                    <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-zinc-700">
                                                        <Image
                                                            src={jizdniRad.files.odpoledni.image_url}
                                                            alt={`Náhled Odpolední JŘ Linka ${jizdniRad.line_number}`}
                                                            layout="fill"
                                                            objectFit="contain"
                                                            className="rounded-lg" loading="lazy"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600">
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