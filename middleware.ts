// middleware.ts

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Cesty, které vyžadují přihlášení (role 'user' nebo 'admin')
const PROTECTED_PATHS_FOR_USER = [
    '/user-portal', 
    '/documents', 
    '/chat',
    '/tables'
];

// Cesty, které vyžadují roli 'admin'
const PROTECTED_PATHS_FOR_ADMIN = [
    '/admin',
];

export async function middleware(request: NextRequest) {
    
    // Vytvoření server klienta pro přístup k relaci (session) přes cookies
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => request.cookies.get(name)?.value,
                set: (name, value, options) => {
                    // Middleware vrací upravenou odpověď, která nastavuje cookie
                    request.cookies.set({ name, value, ...options })
                },
                remove: (name, options) => {
                    request.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Získání relace z cookies
    const { data: { session } } = await supabase.auth.getSession();
    const pathname = request.nextUrl.pathname;

    // --- LOGIKA PRO PŘESMĚROVÁNÍ ---

    // 1. Ochrana cest pro "user" a "admin"
    const isProtectedUserPath = PROTECTED_PATHS_FOR_USER.some(path => pathname.startsWith(path));

    if (isProtectedUserPath && !session) {
        // Uživatel není přihlášen a snaží se dostat na chráněnou cestu
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/prihlaseni';
        // Přidáme původní cestu do URL, aby se po přihlášení mohl vrátit
        redirectUrl.searchParams.set(`redirectTo`, pathname);
        return NextResponse.redirect(redirectUrl);
    }
    
    // Zde by normálně proběhla kontrola role:
    // 2. Ochrana cest pro "admin" (Vyžaduje načtení role z DB)
    
    if (session) {
        // Zde byste volali Supabase DB pro získání role uživatele:
         const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
         const userRole = profile?.role; // 'user' nebo 'admin'

        const isAdminPath = PROTECTED_PATHS_FOR_ADMIN.some(path => pathname.startsWith(path));

        if (isAdminPath && userRole !== 'admin') {
            // Uživatel je přihlášen, ale nemá roli 'admin' pro cestu /admin
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = '/'; // Přesměrování na úvod
            return NextResponse.redirect(redirectUrl);
        }
    }
    
    
    // 3. Přihlášený uživatel na stránce /prihlaseni
    if (session && pathname === '/prihlaseni') {
        // Přihlášeného uživatele posíláme pryč z přihlašovací stránky
        const redirectUrl = request.nextUrl.clone();
        // Vracíme ho tam, odkud přišel, nebo na domovskou stránku portálu
        redirectUrl.pathname = request.nextUrl.searchParams.get('redirectTo') || '/user-portal/dokumenty';
        redirectUrl.searchParams.delete('redirectTo');
        return NextResponse.redirect(redirectUrl);
    }

    // Pokračování na požadovanou cestu
    return NextResponse.next();
}

// Konfigurace: Middleware se spustí pouze pro tyto cesty (včetně API Routes)
export const config = {
  matcher: [
    /*
     * Všechny cesty kromě:
     * - _next/static (statické soubory)
     * - _next/image (Next.js obrázky)
     * - favicon.ico (favicon)
     * - Veřejné assety
     * - Kořenové cesty, které nemusí být chráněné (např. úvod, kontakt)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|prihlaseni|kontakt|o-aplikaci|mapa).*)',
  ],
};