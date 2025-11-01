import Image from "next/image";

// pro Google maps api key: AIzaSyD4X1r8F3o3Y5bJ0KJXb6Z1x7Z2y3A4B5C6D
// test key: AIzaSyA3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R
// test key restrictions: HTTP referrers (web sites): localhost/*, yourdomain.com/*
// test key restrictions: API restrictions: Maps JavaScript API, Geocoding API
// Note: Remember to replace 'yourdomain.com' with your actual domain when deploying.
// Also, ensure that billing is enabled on your Google Cloud project to use the Maps API.
// Finally, consider securing your API key further by using environment variables and server-side proxying if necessary.
//
// pro pouziti Google Maps pouzit napriklad knihovnu react-leaflet nebo @react-google-maps/api

export default function Maps() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Začneme implementací map pomocí Google Maps API. 
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Tato stránka je připravena pro implementaci map pomocí Google Maps API. 
            Nezapomeňte nahradit testovací API klíč vaším vlastním klíčem a nakonfigurovat
            potřebná oprávnění a omezení pro bezpečné používání API.
          </p>
        </div>
      </main>
    </div>
  );
}
