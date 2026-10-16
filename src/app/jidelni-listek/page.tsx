'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import { Utensils, Upload, Eye, EyeOff, RefreshCw, CalendarDays, CalendarClock, X, ZoomIn } from 'lucide-react';

export default function JidelniListekPage() {
    const { isLoading: isAuthLoading, role } = useAuth();
    const isAdmin = role === 'admin';

    // Stavy pro AKTUÁLNÍ týden
    const [isVisibleCurrent, setIsVisibleCurrent] = useState<boolean>(true);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

    // Stavy pro NÁSLEDUJÍCÍ týden
    const [isVisibleNext, setIsVisibleNext] = useState<boolean>(false);
    const [nextImageUrl, setNextImageUrl] = useState<string | null>(null);

    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [isUploadingCurrent, setIsUploadingCurrent] = useState<boolean>(false);
    const [isUploadingNext, setIsUploadingNext] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // 💡 Stav pro lightbox (celoobrazovkový náhled obrázku)
    const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

    const BUCKET_NAME = 'jidelni-listek';
    const FILE_CURRENT = 'aktualni_menu.jpg';
    const FILE_NEXT = 'nasledujici_menu.jpg';

    // Načtení stavů a URL adres
    const fetchData = async () => {
        setIsLoadingData(true);
        setError(null);
        try {
            const { data: configData, error: configError } = await supabase
                .from('app_config')
                .select('id, is_visible')
                .in('id', ['jidelni_listek', 'jidelni_listek_priprava']);

            if (!configError && configData) {
                configData.forEach(item => {
                    if (item.id === 'jidelni_listek') setIsVisibleCurrent(item.is_visible);
                    if (item.id === 'jidelni_listek_priprava') setIsVisibleNext(item.is_visible);
                });
            }

            const timestamp = new Date().getTime();

            const { data: urlCurrent } = supabase.storage.from(BUCKET_NAME).getPublicUrl(FILE_CURRENT);
            if (urlCurrent?.publicUrl) {
                setCurrentImageUrl(`${urlCurrent.publicUrl}?t=${timestamp}`);
            }

            const { data: urlNext } = supabase.storage.from(BUCKET_NAME).getPublicUrl(FILE_NEXT);
            if (urlNext?.publicUrl) {
                setNextImageUrl(`${urlNext.publicUrl}?t=${timestamp}`);
            }

        } catch (err) {
            console.error(err);
            setError('Nepodařilo se načíst data jídelních lístků.');
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Přepínání viditelnosti v DB
    const toggleVisibility = async (type: 'current' | 'next') => {
        if (!isAdmin) return;

        const configId = type === 'current' ? 'jidelni_listek' : 'jidelni_listek_priprava';
        const currentState = type === 'current' ? isVisibleCurrent : isVisibleNext;
        const nextState = !currentState;

        try {
            const { error: updateError } = await supabase
                .from('app_config')
                .update({ is_visible: nextState })
                .eq('id', configId);

            if (updateError) throw updateError;

            if (type === 'current') setIsVisibleCurrent(nextState);
            if (type === 'next') setIsVisibleNext(nextState);
        } catch (err) {
            console.error(err);
            alert('Chyba při změně viditelnosti.');
        }
    };

    // Komprese obrázku přes Canvas
    const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Nepodařilo se získat Canvas 2D.'));

                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Komprese selhala.'));
                    }, 'image/jpeg', quality);
                };
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // Zpracování uploadu
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'current' | 'next') => {
        if (!isAdmin || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const targetFile = type === 'current' ? FILE_CURRENT : FILE_NEXT;

        if (type === 'current') setIsUploadingCurrent(true);
        if (type === 'next') setIsUploadingNext(true);

        try {
            const compressedBlob = await compressImage(file, 1400, 0.75);

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(targetFile, compressedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            alert(`Jídelní lístek pro ${type === 'current' ? 'aktuální' : 'následující'} týden byl úspěšně aktualizován.`);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(`Chyba při nahrávání: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsUploadingCurrent(false);
            setIsUploadingNext(false);
        }
    };

    const formattedDate = new Date().toLocaleDateString('cs-CZ', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    if (isAuthLoading || isLoadingData) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <GridLoader color="#4F46E5" size={10} />
            </div>
        );
    }

    // Pomocná komponenta pro vykreslení karty s lístkem
    const MenuCard = ({ title, isVisible, imageUrl, icon }: { title: string, isVisible: boolean, imageUrl: string | null, icon: React.ReactNode }) => (
        <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 flex flex-col h-full">
            <div className="flex items-center space-x-2 font-bold text-lg text-gray-800 dark:text-gray-100 mb-4 border-b pb-2">
                {icon}
                <h2>{title}</h2>
            </div>

            {!isVisible ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50/50 dark:bg-zinc-900/20 min-h-[300px]">
                    <EyeOff className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-zinc-400 text-center text-sm font-medium">
                        Aktuálně není k dispozici jídelní lístek.
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex justify-center items-center">
                    {imageUrl ? (
                        /* 💡 Přidán interaktivní wrapper, který indikuje možnost zvětšení a při kliknutí otevře modal */
                        <div
                            onClick={() => setActiveLightboxUrl(imageUrl)}
                            className="relative cursor-zoom-in group max-w-full h-auto rounded-lg overflow-hidden border dark:border-zinc-700 shadow-md"
                            title="Klikněte pro zvětšení obrázku"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt={title}
                                className="max-w-full h-auto transition duration-300 group-hover:brightness-90 group-hover:scale-[1.01]"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                            {/* Překryvná ikonka lupy, která se ukáže při najetí myši */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10">
                                <div className="bg-black/60 text-white p-2.5 rounded-full backdrop-blur-sm">
                                    <ZoomIn className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Načítání obrázku...</p>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">

                {/* --- HLAVIČKA --- */}
                <header className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg mb-8 text-center border border-gray-100 dark:border-zinc-700 max-w-4xl mx-auto">
                    <div className="flex items-center justify-center space-x-3 text-blue-600 dark:text-blue-400 mb-2">
                        <Utensils className="w-8 h-8" />
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Jídelní lístky</h1>
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{formattedDate}</p>
                    {isAdmin && <span className="inline-block mt-2 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full dark:bg-red-900/40 dark:text-red-400">ADMINISTRACE</span>}
                </header>

                {error && <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-xl text-center mb-8 max-w-4xl mx-auto">{error}</div>}

                {/* --- MŘÍŽKA S JÍDELNÍMI LÍSTKY --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <MenuCard
                        title="Aktuální týden"
                        isVisible={isVisibleCurrent}
                        imageUrl={currentImageUrl}
                        icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
                    />
                    <MenuCard
                        title="Následující týden"
                        isVisible={isVisibleNext}
                        imageUrl={nextImageUrl}
                        icon={<CalendarClock className="w-5 h-5 text-green-500" />}
                    />
                </div>

                {/* --- ADMIN PANEL --- */}
                {isAdmin && (
                    <section className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg border-2 border-red-200 dark:border-red-900/30 max-w-4xl mx-auto">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                            <RefreshCw className="w-5 h-5 text-red-500 mr-2" />
                            Správa jídelních lístků
                        </h2>

                        <div className="space-y-6">
                            {/* Sekce pro Aktuální týden */}
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900/40 rounded-lg border dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-700 dark:text-zinc-200 text-sm">AKTUÁLNÍ TÝDEN</h3>
                                    <p className="text-xs text-gray-400">Soubor: {FILE_CURRENT}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => toggleVisibility('current')}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${isVisibleCurrent ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {isVisibleCurrent ? <><EyeOff className="w-4 h-4" /> <span>Vypnout</span></> : <><Eye className="w-4 h-4" /> <span>Zapnout</span></>}
                                    </button>
                                    <label htmlFor="upload-current" className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition cursor-pointer ${isUploadingCurrent ? 'opacity-50' : ''}`}>
                                        <Upload className="w-4 h-4" />
                                        <span>{isUploadingCurrent ? 'Nahrávání...' : 'Nahrát obrázek'}</span>
                                    </label>
                                    <input type="file" id="upload-current" accept="image/*" onChange={(e) => handleFileUpload(e, 'current')} className="hidden" disabled={isUploadingCurrent} />
                                </div>
                            </div>

                            {/* Sekce pro Následující týden */}
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900/40 rounded-lg border dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-700 dark:text-zinc-200 text-sm">NÁSLEDUJÍCÍ TÝDEN</h3>
                                    <p className="text-xs text-gray-400">Soubor: {FILE_NEXT}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => toggleVisibility('next')}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${isVisibleNext ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {isVisibleNext ? <><EyeOff className="w-4 h-4" /> <span>Vypnout</span></> : <><Eye className="w-4 h-4" /> <span>Zapnout</span></>}
                                    </button>
                                    <label htmlFor="upload-next" className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition cursor-pointer ${isUploadingNext ? 'opacity-50' : ''}`}>
                                        <Upload className="w-4 h-4" />
                                        <span>{isUploadingNext ? 'Nahrávání...' : 'Nahrát obrázek'}</span>
                                    </label>
                                    <input type="file" id="upload-next" accept="image/*" onChange={(e) => handleFileUpload(e, 'next')} className="hidden" disabled={isUploadingNext} />
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-4">* Oba obrázky se nahrávají s automatickou kompresí. Uživatelům se po změně obrázku ihned promítne nová verze díky ošetření mezipaměti prohlížeče.</p>
                    </section>
                )}

                {/* 💡 CELOOBRAZOVKOVÝ MODAL (LIGHTBOX) PRO ZVĚTŠENÍ OBRÁZKU */}
                {activeLightboxUrl && (
                    <div
                        onClick={() => setActiveLightboxUrl(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm cursor-zoom-out animate-fade-in"
                    >
                        {/* Tlačítko pro zavření v pravém horním rohu */}
                        <button
                            onClick={() => setActiveLightboxUrl(null)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition duration-200 z-50 shadow-lg"
                            title="Zavřít náhled"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Kontejner pro samotný obrázek zajišťující, že nepřeteče displej */}
                        <div className="relative max-w-full max-h-[94vh] flex items-center justify-center select-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={activeLightboxUrl}
                                alt="Zvětšený náhled jídelního lístku"
                                className="max-w-full max-h-[94vh] object-contain rounded-lg shadow-2xl border border-white/10 animate-scale-up"
                                onClick={(e) => e.stopPropagation()} // Zamezí zavření náhledu při kliknutí přímo na obrázek
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}