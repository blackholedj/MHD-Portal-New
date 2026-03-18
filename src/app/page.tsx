'use client'; // Nutné pro použití useAuth()

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, File, MapPin, Table, BusFront, ArrowRight } from "lucide-react";
import { useAuth } from '@/context/AuthContext';

export default function About() {
  const { role } = useAuth();

  // Logika oprávnění (shodná s navigací)
  const isUserOrAdmin = role === 'user' || role === 'admin';

  // --- Komponenta pro jednotlivé karty funkcí ---
  const Feature = ({ icon, title, children, href }: { 
    icon: React.ReactNode; 
    title: string; 
    children: React.ReactNode;
    href: string;
  }) => (
    <Link href={href} className="group block h-full">
      <div className="flex flex-col items-center text-center p-6 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg hover:shadow-2xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 bg-white dark:bg-zinc-800 h-full">
        <div className="text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="w-full text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b pb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-zinc-300 text-sm">
          {children}
        </p>
        <div className="mt-auto pt-4 flex items-center text-blue-500 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          OTEVŘÍT SEKCI <ArrowRight size={14} className="ml-1" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4 sm:p-8">
      
      <main className="w-full max-w-4xl flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-zinc-800 shadow-2xl rounded-2xl">
        
        <h2 className="max-w-4xl mx-auto text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b pb-2 text-center">
          O aplikaci DpMost Portál
        </h2>

        <Image 
          src="/images/logo-dpmost.png" 
          alt="DpMost Portál"
          width={250} 
          height={250}
          className="mx-auto rounded-full shadow-lg mb-8" 
        />        

        <p className="max-w-xl text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 text-center mb-10">
          MHD Portál je moderní webová platforma navržená speciálně pro řidiče
          autobusů a tramvají. Naším cílem je zjednodušit přístup k důležitým
          informacím a usnadnit každodenní provoz.
        </p>

        <div className="w-full">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-800 dark:text-zinc-50">
            Klíčové funkce
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {isUserOrAdmin ? (
              <>
                {/* --- Viditelné pouze pro přihlášené --- */}
                <Feature icon={<MessageCircle size={28} />} title="Nástěnka (Chat)" href="/user-portal/chat">
                  Rychlá a jednoduchá komunikace s kolegy. Sdílejte důležité
                  informace a postřehy v reálném čase.
                </Feature>
                <Feature icon={<File size={28} />} title="Správa dokumentů" href="/user-portal/documents">
                  Všechny důležité manuály, příručky a směrnice bezpečně
                  uložené a dostupné kdykoliv ke stažení.
                </Feature>
                <Feature icon={<Table size={28} />} title="Tabulky" href="/user-portal/tables">
                  Fotogalérie provozních tabulek pro řidiče MHD.
                </Feature>
              </>
            ) : (
              /* --- Karta pro NEPŘIHLÁŠENÉ (Call to Action) --- */
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

            {/* --- Veřejná funkce (vždy viditelná) --- */}
            <Feature
              icon={<MapPin size={28} />}
              title="Interaktivní mapa"
              href="/maps"
            >
              Přehledná mapa všech zastávek a linek s detailními informacemi po
              kliknutí.
            </Feature>
          </div>
        </div>
      </main>
    </div>
  );
}