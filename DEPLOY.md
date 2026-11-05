# Nasazení DPMOST na existující Netlify web

Cíl: https://dpmost.netlify.app, ID `595475d6-dc41-4145-9e35-278c0da44d06`.

Potřeba: Node.js 22.16+ (doporučeno 24), nainstalované závislosti a Netlify CLI. Přihlášení: `netlify login`.

```sh
cd /Users/macbookl/Programovani/Projekty/Webove/DPMOST/portal
npm run deploy:production
```

Příkaz vždy sestaví aktuální lokální zdroje, nahraje koncept na existující web, ověří logo včetně optimalizace, shodu JavaScriptu a ochranu API, pak publikuje stejný balíček a ověří produkci. Zahrnuje i lokální necommitnuté změny. Neprovádí git commit/push, SQL migrace ani změny Supabase/R2. Neověřuje přihlášené administrátorské operace.

Pouze koncept bez publikování: `npm run deploy:preview`.

## Soukromá konfigurace

`.env.deploy.local` v kořeni projektu obsahuje veřejné Supabase nastavení, soukromé R2 údaje a příznaky běžící produkce. Má oprávnění 600 a Git ho ignoruje. Zálohujte jej do správce hesel nebo šifrované zálohy. Nikdy jej neposílejte na GitHub. Netlify přihlášení spravuje CLI samostatně; v tomto souboru není přístupový token Netlify. Při přesunu projektu přeneste i tento skrytý soubor.

Název Supabase projektu byl historicky staging; aktuální adresa v konfiguraci obsluhuje produkci. Skript neprovádí žádné testovací zápisy.

## Důležité pro Next.js

Nepublikujte samotnou `.next` ani samotnou `.netlify/static` bez pravidel pluginu. Skript publikuje `.netlify/static`. Kořenový `netlify.toml` výslovně zachovává přesměrování `/_next/image` na Netlify Images i při nasazení již sestaveného balíčku.

Při chybě před publikováním produkce zůstává původní. Při chybě po publikování je nutné zkontrolovat živý web. Předchozí deploy ID se vypisuje na začátku; návrat je možný v Netlify v historii deployů přes Publish deploy.
