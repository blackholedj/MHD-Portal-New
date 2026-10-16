'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle, File, MapPin, Table, BusFront, ArrowRight,
  Utensils, AlertTriangle, Eye, EyeOff, Upload, X, ZoomIn, RefreshCw
} from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';

export default function About() {
  const { role, isLoading: isAuthLoading } = useAuth();
  const isUserOrAdmin = role === 'user' || role === 'admin';
  const isAdmin = role === 'admin';

  // --- Stavy pro důležité upozornění ---
  const [isAlertVisible, setIsAlertVisible] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string>("");
  const [alertImageUrl, setAlertImageUrl] = useState<string | null>(null);
  const [isLoadingAlert, setIsLoadingAlert] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSavingText, setIsSavingText] = useState<boolean>(false);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

  const BUCKET_NAME = 'oznameni';
  const FILE_NAME = 'upozorneni.jpg';

  // Načtení konfigurace upozornění
  const fetchAlertData = async () => {
    setIsLoadingAlert(true);
    try {
      const { data: configData, error: configError } = await supabase
        .from('app_config')
        .select('id, is_visible, text_value')
        .in('id', ['dulezite_upozorneni']);

      if (!configError && configData && configData.length > 0) {
        setIsAlertVisible(configData[0].is_visible);
        setAlertText(configData[0].text_value || "");
      }

      const timestamp = new Date().getTime();
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(FILE_NAME);

      if (urlData?.publicUrl) {
        setAlertImageUrl(`${urlData.publicUrl}?t=${timestamp}`);
      }
    } catch (err) {
      console.error("Chyba při načítání upozornění:", err);
    } finally {
      setIsLoadingAlert(false);
    }
  };

  useEffect(() => {
    if (isUserOrAdmin) {
      fetchAlertData();
    } else {
      setIsLoadingAlert(false);
    }
  }, [isUserOrAdmin]);

  // Uložení nového textu adminem
  const handleSaveText = async () => {
    if (!isAdmin) return;
    setIsSavingText(true);
    try {
      const { error } = await supabase
        .from('app_config')
        .update({ text_value: alertText })
        .eq('id', 'dulezite_upozorneni');

      if (error) throw error;
      alert("Text upozornění byl úspěšně uložen.");
    } catch (err) {
      console.error(err);
      alert("Chyba při ukládání textu.");
    } finally {
      setIsSavingText(false);
    }
  };

  // Přepnutí viditelnosti adminem
  const toggleAlertVisibility = async () => {
    if (!isAdmin) return;
    const nextState = !isAlertVisible;
    try {
      const { error } = await supabase
        .from('app_config')
        .update({ is_visible: nextState })
        .eq('id', 'dulezite_upozorneni');

      if (error) throw error;
      setIsAlertVisible(nextState);
    } catch (err) {
      console.error(err);
      alert("Chyba při změně viditelnosti.");
    }
  };

  // Nahrání obrázku k upozornění
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin || !e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const file = e.target.files[0];

    try {
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new window.Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > 1200) {
              height = Math.round((height * 1200) / width);
              width = 1200;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Chyba komprese")), 'image/jpeg', 0.8);
          };
        };
      });

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(FILE_NAME, compressedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      alert("Obrázek k upozornění byl úspěšně nahrán.");
      fetchAlertData();
    } catch (err) {
      console.error(err);
      alert("Chyba při nahrávání obrázku.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- 🎨 Definice podporovaných barev pro karty ---
  type ColorOption = 'blue' | 'amber' | 'emerald' | 'violet' | 'cyan' | 'teal';

  // Mapování Tailwind tříd, aby je kompilátor správně zaregistroval
  const colorMap = {
    blue: {
      icon: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500",
      hoverText: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
      arrow: "text-blue-500"
    },
    amber: {
      icon: "text-amber-600 dark:text-amber-400",
      hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
      hoverText: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
      arrow: "text-amber-500"
    },
    emerald: {
      icon: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
      hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
      arrow: "text-emerald-500"
    },
    violet: {
      icon: "text-violet-600 dark:text-violet-400",
      hoverBorder: "hover:border-violet-400 dark:hover:border-violet-500",
      hoverText: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
      arrow: "text-violet-500"
    },
    cyan: {
      icon: "text-cyan-600 dark:text-cyan-400",
      hoverBorder: "hover:border-cyan-400 dark:hover:border-cyan-500",
      hoverText: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
      arrow: "text-cyan-500"
    },
    teal: {
      icon: "text-teal-600 dark:text-teal-400",
      hoverBorder: "hover:border-teal-400 dark:hover:border-teal-500",
      hoverText: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
      arrow: "text-teal-500"
    }
  };

  // --- Komponenta pro jednotlivé karty funkcí s dynamickou barvou ---
  const Feature = ({ icon, title, children, href, color = 'blue' }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    href: string;
    color?: ColorOption;
  }) => {
    const classes = colorMap[color];

    return (
      <Link href={href} className="group block h-full">
        <div className={`flex flex-col items-center text-center p-6 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-zinc-800 h-full ${classes.hoverBorder}`}>
          <div className={`mb-4 group-hover:scale-110 transition-transform duration-300 ${classes.icon}`}>
            {icon}
          </div>
          <h3 className={`w-full text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b pb-2 transition-colors ${classes.hoverText}`}>
            {title}
          </h3>
          <p className="text-gray-600 dark:text-zinc-300 text-sm">
            {children}
          </p>
          <div className={`mt-auto pt-4 flex items-center font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity ${classes.arrow}`}>
            OTEVŘÍT SEKCI <ArrowRight size={14} className="ml-1" />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">

      <main className="w-full max-w-4xl flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-zinc-800 shadow-2xl rounded-2xl">

        <h2 className="max-w-4xl mx-auto text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b pb-2 text-center w-full">
          O aplikaci DpMost Portál
        </h2>

        {/* ========================================================================= */}
        {/* 🚨 1. VELMI VÝRAZNÝ ALERT BOX PRO ŘIDIČE */}
        {/* ========================================================================= */}
        {isUserOrAdmin && isAlertVisible && !isLoadingAlert && (
          <div className="w-full bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl p-5 sm:p-6 mb-8 shadow-xl animate-pulse-subtle flex flex-col items-center text-center">
            <div className="bg-red-500 text-white p-2.5 rounded-xl mb-3 animate-bounce inline-block">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="w-full flex flex-col items-center">
              <h3 className="text-xl font-black text-red-700 dark:text-red-400 uppercase tracking-wide mb-3">
                DŮLEŽITÉ UPOZORNĚNÍ VEDOUCÍHO!
              </h3>

              {alertText && (
                <p className="w-full max-w-2xl text-gray-800 dark:text-zinc-100 font-bold text-base whitespace-pre-wrap leading-relaxed bg-white/60 dark:bg-zinc-900/40 p-4 rounded-xl border border-red-200 dark:border-red-900/50 text-center mx-auto">
                  {alertText}
                </p>
              )}

              {alertImageUrl && (
                <div className="mt-5 w-full flex flex-col items-center justify-center">
                  <p className="text-xs font-semibold text-gray-400 mb-2">Přiložený dokument / plán:</p>
                  <div
                    onClick={() => setActiveLightboxUrl(alertImageUrl)}
                    className="relative cursor-zoom-in group max-w-full rounded-lg overflow-hidden border-2 border-red-200 dark:border-red-900/50 shadow-md bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={alertImageUrl}
                      alt="Příloha upozornění"
                      className="max-h-64 w-full h-auto object-contain transition group-hover:brightness-90"
                      onError={(e) => {
                        console.error("Chyba při načítání obrázku upozornění v HTML");
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/10">
                      <div className="bg-black/70 text-white p-2 rounded-full">
                        <ZoomIn className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Zobrazeni loga aplikace a krátký popis portálu pro řidiče MHD. */}
        <Image
          src="/images/logo-dpmost.png"
          alt="DpMost Portál"
          width={200}
          height={200}
          className="mx-auto rounded-full shadow-lg mb-8"
        />
        {/* Popis portálu */}
        <p className="max-w-xl text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 text-center mb-10">
          MHD Portál je moderní webová platforma navržená speciálně pro řidiče
          autobusů a tramvají. Naším cílem je zjednodušit přístup k důležitým
          informacím a usnadnit každodenní provoz.
        </p>

        {/* --- KLÍČOVÉ FUNKCE MŘÍŽKA --- */}
        <div className="w-full mb-10">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-800 dark:text-zinc-50">
            Klíčové funkce
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {isUserOrAdmin ? (
              <>
                {/* 📊 Tabulky - Modrá */}
                <Feature icon={<Table size={28} />} title="Tabulky" href="/user-portal/tables" color="blue">
                  Fotogalérie provozních tabulek pro řidiče MHD.
                </Feature>

                {/* 🚧 Dopravní info - Oranžová (Amber) */}
                <Feature icon={<MapPin size={28} />} title="Dopravní info" href="/user-portal/dopravni-info" color="amber">
                  Aktuální a plánované výluky, uzavírky silnic, změny v trasách linek a objízdné plánky.
                </Feature>

                {/* 📁 Správa dokumentů - Tyrkysová (Teal) */}
                <Feature icon={<File size={28} />} title="Správa dokumentů" href="/user-portal/documents" color="teal">
                  Všechny důležité manuály, příručky a směrnice bezpečně uložené a dostupné kdykoliv ke stažení.
                </Feature>

                {/* 💬 Nástěnka (Chat) - Fialová (Violet) */}
                <Feature icon={<MessageCircle size={28} />} title="Nástěnka (Chat)" href="/user-portal/chat" color="violet">
                  Rychlá a jednoduchá komunikace s kolegy. Sdílejte důležité informace a postřehy v reálném čase.
                </Feature>
              </>
            ) : (
              /* Sekce pro nezaregistrované uživatele */
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-200 dark:border-zinc-700 rounded-xl bg-blue-50/30 dark:bg-zinc-900/50">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                  <BusFront className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-800 dark:text-zinc-100 mb-2">Sekce pro řidiče</h4>
                <p className="text-gray-600 dark:text-zinc-400 text-center text-sm mb-6">
                  Chat, dokumenty a tabulky jsou dostupné pouze po přihlášení do portálu.
                </p>
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md transform hover:scale-105 active:scale-95"
                >
                  Přihlásit se
                </Link>
              </div>
            )}

            {/* 🍴 Jídelní lístek - Zelená (Emerald) */}
            <Feature icon={<Utensils size={28} />} title="Jídelní lístek" href="/jidelni-listek" color="emerald">
              Aktuální nabídka jídel pro řidiče.
            </Feature>

            {/* 🗺️ Interaktivní mapa - Světle modrá (Cyan) */}
            <Feature icon={<MapPin size={28} />} title="Interaktivní mapa" href="/maps" color="cyan">
              Přehledná mapa všech zastávek a linek s detailními informacemi po kliknutí.
            </Feature>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🛠️ 2. ADMIN PANEL PRO VEDOUCÍHO */}
        {/* ========================================================================= */}
        {isAdmin && (
          <section className="w-full mt-4 p-5 bg-yellow-50 dark:bg-zinc-900/60 rounded-xl border-2 border-amber-400 shadow-md">
            <h4 className="text-base font-bold text-amber-800 dark:text-amber-400 flex items-center mb-3 uppercase tracking-wider">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow" />
              Správa urgentního upozornění (Pouze vedoucí/admin)
            </h4>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Text zprávy pro řidiče:</label>
                <textarea
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  placeholder="Zadejte důležitý text..."
                  rows={3}
                  className="w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 border-amber-200 dark:border-zinc-700">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveText}
                    disabled={isSavingText}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    {isSavingText ? "Ukládám..." : "Uložit text"}
                  </button>

                  <label htmlFor="alert-upload-img" className={`flex items-center space-x-1.5 px-4 py-2 bg-zinc-600 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Nahrávání...' : 'Přidat/Změnit obrázek'}</span>
                  </label>
                  <input type="file" id="alert-upload-img" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                </div>

                <button
                  onClick={toggleAlertVisibility}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition ${isAlertVisible ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isAlertVisible ? <><EyeOff className="w-3.5 h-3.5" /> <span>SKRÝT ŘIDIČŮM</span></> : <><Eye className="w-3.5 h-3.5" /> <span>ZOBRAZIT ŘIDIČŮM</span></>}
                </button>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 🔍 3. LIGHTBOX PRO ZVĚTŠENÍ PŘÍLOHY */}
      {/* ========================================================================= */}
      {activeLightboxUrl && (
        <div
          onClick={() => setActiveLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
        >
          <button onClick={() => setActiveLightboxUrl(null)} className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition z-50">
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-full max-h-[92vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeLightboxUrl} alt="Detail přílohy" className="max-w-full max-h-[92vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

    </div>
  );
}