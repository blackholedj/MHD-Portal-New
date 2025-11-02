import Image from "next/image";
import { MessageCircle, File, MapPin, Table  } from "lucide-react";


export default function About() {
  const Feature = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-center text-center p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="text-blue-500 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{children}</p>
    </div>
  );
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black flex-col p-8">
     <main className="flex w-full max-w-4xl flex-col items-center justify-center py-20 px-8 bg-white dark:bg-black shadow-lg rounded-xl">

      <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 mb-4">
        O aplikaci MHD Portál
      </h1>
      <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400 text-center">
        MHD Portál je moderní webová platforma navržená speciálně pro řidiče
        autobusů a tramvají. Naším cílem je zjednodušit přístup k důležitým
        informacím, usnadnit komunikaci a poskytnout všechny potřebné nástroje
        na jednom místě.
      </p>

      <div className="space-y-8">
        <h2 className=" font-bold text-center m-6 text-gray-800">
          Klíčové funkce
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Feature icon={<MessageCircle size={25} />} title="Nástěnka (Chat)">
            Rychlá a jednoduchá komunikace s kolegy. Sdílejte důležité
            informace, vzkazy a postřehy z provozu v reálném čase.
          </Feature>
          <Feature icon={<File size={25} />} title="Správa dokumentů">
            Všechny důležité manuály, příručky, směrnice a tabulky bezpečně
            uložené a dostupné kdykoliv ke stažení.
          </Feature>
          <Feature icon={<Table size={25} />} title="Tabulky">
            Fotogalérie provozních tabulek pro řidiče MHD.
          </Feature>
          <Feature
            icon={<MapPin size={25} />}
            title="Interaktivní mapa"
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
