// src/app/maps/page.tsx

import Link from "next/link";
import { ArrowUpRight } from "lucide-react"; // Importujeme ikonu pro externí odkaz

// Ponecháváme komentáře pro Google Maps jako budoucí referenci, ale NEPOUŽÍVÁME JE TEĎ.

export default function Maps() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans dark:bg-gray-900 p-4 sm:p-8">
      <main className="w-full max-w-4xl flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-zinc-800 shadow-2xl rounded-2xl">
        
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-4xl mx-auto text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b pb-2">
            Mapa polohy vozidel MHD 🚌
          </h2>
          
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Z důvodu technických omezení zabezpečení externí mapové služby 
            **není možné** zobrazit mapu MHD přímo na této stránce. 
            Kliknutím na tlačítko budete **přesměrováni** na oficiální stránku města Mostu, 
            kde uvidíte aktuální polohu vozidel.
          </p>

          {/* TLAČÍTKO S PŘÍMÝM ODKAZEM */}
          <Link
            href="https://mapy.mesto-most.cz/app/mhd/"
            target="_blank" // Otevře v novém okně/záložce
            rel="noopener noreferrer" // Bezpečnostní doporučení
            className="mt-8 flex items-center bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-xl shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            Zobrazit mapu MHD Most a Litvínov
            <ArrowUpRight className="w-5 h-5 ml-2" />
          </Link>

        </div>
      </main>
    </div>
  );
}