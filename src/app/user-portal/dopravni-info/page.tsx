'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import {
    Megaphone, Calendar, FileText, Upload, Trash2, Plus, X, ZoomIn, Info, EyeOff
} from 'lucide-react';

interface DopravniInfoItem {
    id: string;
    title: string;
    description: string;
    valid_from: string;
    valid_to: string | null;
    images: string[];
    created_at: string;
}

export default function DopravniInfoPage() {
    const { role, isLoading: isAuthLoading } = useAuth();
    const isAdmin = role === 'admin';

    const [items, setItems] = useState<DopravniInfoItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

    // --- Stavy pro nový formulář ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
    const [validTo, setValidTo] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [issubmitting, setIsSubmitting] = useState(false);

    const BUCKET_NAME = 'dopravni-info';

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('dopravni_info')
                .select('*')
                .order('valid_from', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Chyba při načítání dopravního info:', err);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Pomocná funkce pro kompresi obrázku
    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new window.Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > 1400) {
                        height = Math.round((height * 1400) / width);
                        width = 1400;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Komprese selhala')), 'image/jpeg', 0.8);
                };
            };
        });
    };

    // Uložení nového dopravního info dispečerem
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return alert('Vyplňte nadpis a popis.');

        setIsSubmitting(true);
        const uploadedImageUrls: string[] = [];

        try {
            // 1. Nahrání všech vybraných obrázků (pokud nějaké jsou)
            for (const file of selectedFiles) {
                const compressedBlob = await compressImage(file);
                const fileExt = 'jpg';
                const fileName = `dopravni_info/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
                if (urlData?.publicUrl) {
                    uploadedImageUrls.push(urlData.publicUrl);
                }
            }

            // 2. Zápis dat do tabulky
            const { error: insertError } = await supabase
                .from('dopravni_info')
                .insert({
                    title,
                    description,
                    valid_from: validFrom,
                    valid_to: validTo || null,
                    images: uploadedImageUrls
                });

            if (insertError) throw insertError;

            // Reset formuláře
            setTitle('');
            setDescription('');
            setValidTo('');
            setSelectedFiles([]);
            alert('Dopravní info bylo úspěšně publikováno.');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Chyba při ukládání dopravního info.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Smazání hlášení adminem
    const handleDelete = async (id: string, images: string[]) => {
        if (!confirm('Opravdu chcete toto dopravní info smazat?')) return;

        try {
            // Smazání záznamu z DB
            const { error: deleteError } = await supabase.from('dopravni_info').delete().eq('id', id);
            if (deleteError) throw deleteError;

            // Odstranění souborů ze Storage, pokud existovaly
            if (images.length > 0) {
                const pathsToDelete = images.map(url => {
                    const parts = url.split(`${BUCKET_NAME}/`);
                    return parts.length > 1 ? parts[1] : '';
                }).filter(p => p !== '');

                if (pathsToDelete.length > 0) {
                    await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);
                }
            }

            fetchData();
        } catch (err) {
            console.error(err);
            alert('Chyba při mazání.');
        }
    };

    if (isAuthLoading || isLoadingData) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <GridLoader color="#4F46E5" size={10} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">

                {/* --- HLAVIČKA SEKCE --- */}
                <header className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg mb-8 text-center border border-gray-100 dark:border-zinc-700">
                    <div className="flex items-center justify-center space-x-3 text-amber-600 dark:text-amber-400 mb-2">
                        <Megaphone className="w-8 h-8" />
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dopravní info</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Výluky, uzavírky a provozní změny na síti MHD</p>
                </header>

                {/* --- FORMULÁŘ PRO DISPEČERA / ADMINA --- */}
                {isAdmin && (
                    <section className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg border-2 border-amber-400 mb-8">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                            <Plus className="w-5 h-5 mr-2 text-amber-500" /> Nové dopravní omezení / výluka
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">NÁZEV VÝLUKY / UZAVÍRKY</label>
                                <input
                                    type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Např. Uzavírka ulice Budovatelů"
                                    className="w-full p-2.5 rounded-lg border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">PODROBNÝ POPIS (Změny tras, zastávek, dotčené linky)</label>
                                <textarea
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Popište podrobně trasu objezdu a změny pro řidiče..." rows={4}
                                    className="w-full p-2.5 rounded-lg border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-400 text-sm whitespace-pre-wrap"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">PLATNOST OD</label>
                                    <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="w-full p-2.5 rounded-lg border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">PLATNOST DO (nechte prázdné, pokud nevíte)</label>
                                    <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="w-full p-2.5 rounded-lg border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">PŘILOŽIT PLÁNKY / OBRÁZKY (Můžete vybrat i více souborů najednou)</label>
                                <label className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/50 border-gray-300 dark:border-zinc-700 transition">
                                    <Upload className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">Vybrat obrázky z disku</span>
                                    <input
                                        type="file" multiple accept="image/*" className="hidden"
                                        onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                                    />
                                </label>
                                {selectedFiles.length > 0 && (
                                    <div className="mt-2 p-2 bg-gray-50 dark:bg-zinc-900/40 rounded-lg border dark:border-zinc-700">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Vybrané soubory k nahrání:</p>
                                        <ul className="text-xs text-gray-600 dark:text-zinc-400 list-disc list-inside">
                                            {selectedFiles.map((file, idx) => <li key={idx}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit" disabled={issubmitting}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition disabled:opacity-50"
                            >
                                {issubmitting ? 'Ukládám a nahrávám soubory...' : 'Publikovat dopravní info'}
                            </button>
                        </form>
                    </section>
                )}

                {/* --- SEZNAM DOPRAVNÍCH INFORMACÍ PRO ŘIDIČE --- */}
                <div className="space-y-6">
                    {items.length === 0 ? (
                        <div className="bg-white dark:bg-zinc-800 p-8 rounded-xl shadow border border-gray-100 dark:border-zinc-700 text-center text-gray-500">
                            <Info className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                            Aktuálně nejsou hlášeny žádné výluky ani uzavírky.
                        </div>
                    ) : (
                        items.map((item) => {
                            const fromStr = new Date(item.valid_from).toLocaleDateString('cs-CZ');
                            const toStr = item.valid_to ? new Date(item.valid_to).toLocaleDateString('cs-CZ') : 'neurčito';

                            return (
                                <article key={item.id} className="bg-white dark:bg-zinc-800 p-5 sm:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 relative group">

                                    {/* Tlačítko pro smazání (jen pro admina) */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDelete(item.id, item.images)}
                                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                            title="Smazat záznam"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    {/* Nadpis a platnost */}
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 pr-8 border-b pb-2 mb-3">
                                        {item.title}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-lg mb-4 w-fit">
                                        <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> Platnost: {fromStr} – {toStr}</span>
                                    </div>

                                    {/* Textový popis výluky */}
                                    <p className="text-sm leading-relaxed text-gray-700 dark:text-zinc-300 font-medium whitespace-pre-wrap bg-gray-50 dark:bg-zinc-900/30 p-3 rounded-lg border dark:border-zinc-700/60">
                                        {item.description}
                                    </p>

                                    {/* --- DYNAMICKÉ ZOBRAZENÍ OBRÁZKŮ --- */}
                                    {item.images && item.images.length > 0 && (
                                        <div className="mt-4 pt-2">
                                            <p className="text-xs font-bold text-gray-400 mb-2 flex items-center">
                                                <FileText className="w-3.5 h-3.5 mr-1" /> Přiložené plánky / schémata ({item.images.length}):
                                            </p>

                                            {/* Flex mřížka pro flexibilní zobrazení (podle počtu obrázků) */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {item.images.map((imgUrl, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => setActiveLightboxUrl(imgUrl)}
                                                        className="relative cursor-zoom-in group aspect-[4/3] rounded-lg overflow-hidden border dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 shadow-sm"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={imgUrl}
                                                            alt={`Plánek ${index + 1}`}
                                                            className="w-full h-full object-cover transition group-hover:scale-[1.03] group-hover:brightness-90"
                                                            onError={(e) => (e.target as HTMLElement).style.display = 'none'}
                                                        />
                                                        {/* Symbol lupy při hoveru */}
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/10">
                                                            <div className="bg-black/60 text-white p-1.5 rounded-full">
                                                                <ZoomIn className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </article>
                            );
                        })
                    )}
                </div>

                {/* --- LIGHTBOX MODAL PRO ZVĚTŠENÍ JAKÉHOKOLIV PLÁNKU --- */}
                {activeLightboxUrl && (
                    <div
                        onClick={() => setActiveLightboxUrl(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-sm cursor-zoom-out"
                    >
                        <button onClick={() => setActiveLightboxUrl(null)} className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
                            <X className="w-6 h-6" />
                        </button>
                        <div className="relative max-w-full max-h-[94vh] flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={activeLightboxUrl} alt="Detail výlukového plánu" className="max-w-full max-h-[94vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}