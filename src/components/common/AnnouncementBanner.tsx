// src/components/AnnouncementBanner.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { X, Bell, Loader2 } from 'lucide-react';

// --- TYPY DAT ---
interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: number;
}

const AnnouncementBanner: React.FC = () => {
    const { user, status, role, isLoading: isAuthLoading } = useAuth();
    const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDismissing, setIsDismissing] = useState<string | null>(null); // ID právě odstraňovaného oznámení

    // Funkce pro načtení nepřečtených oznámení
    const fetchUnreadAnnouncements = useCallback(async () => {
        if (isAuthLoading || !user || status !== 'approved') {
            setIsLoading(false);
            setUnreadAnnouncements([]);
            return;
        }

        setIsLoading(true);

        // 1. Určení cílové role pro dotaz
        const targetRoles = ['all', role].filter((r): r is 'all' | 'admin' | 'user' => r === 'all' || r === 'admin' || r === 'user');

        // 2. Načtení ID oznámení, které uživatel JIZ PŘEČETL
        const { data: readIdsData, error: readError } = await supabase
            .from('user_announcement_reads')
            .select('announcement_id')
            .eq('user_id', user.id); // Klíčové: filtrujeme na aktuálního uživatele

        if (readError) {
            console.error('Chyba při načítání přečtených ID:', readError);
            setIsLoading(false);
            return;
        }

        const readAnnouncementIds = readIdsData?.map(r => r.announcement_id) || [];
        
        // Zde použijeme "NOT IN" na straně Supabase, pokud je seznam čtených ID neprázdný
        let query = supabase
            .from('portal_announcements')
            .select(`id, title, content, priority`)
            .eq('is_active', true)
            .in('target_role', targetRoles)
            .order('priority', { ascending: false });

        // 3. Aplikace filtru pro nepřečtené (pomocí .not().in())
        if (readAnnouncementIds.length > 0) {
            query = query.not('id', 'in', `(${readAnnouncementIds.join(',')})`);
        }

        const { data: announcements, error: fetchError } = await query;

        if (fetchError) {
            console.error('Chyba při načítání oznámení:', fetchError);
            setIsLoading(false);
            return;
        }

        // 4. Nastavení nepřečtených oznámení
        setUnreadAnnouncements(announcements as Announcement[] || []);
        setIsLoading(false);
        
    }, [isAuthLoading, user, status, role]);

    useEffect(() => {
        fetchUnreadAnnouncements();
    }, [fetchUnreadAnnouncements]);

    // Funkce pro označení oznámení jako přečteného (Dismiss)
    const handleDismiss = useCallback(async (announcementId: string) => {
        if (!user) return;

        setIsDismissing(announcementId);

        try {
            // Vložení záznamu do propojovací tabulky
            const { error: insertError } = await supabase
                .from('user_announcement_reads')
                .insert({
                    user_id: user.id, // Klíčové: Uložení vazby na AKTUALNIHO UŽIVATELE
                    announcement_id: announcementId,
                });

            if (insertError) throw insertError;

            // Odebrání z lokálního stavu
            setUnreadAnnouncements(prev => prev.filter(a => a.id !== announcementId));

        } catch (err) {
            console.error('Chyba při označování jako přečteno:', err);
            // Můžete přidat zobrazení chyby uživateli
        } finally {
            setIsDismissing(null);
        }
    }, [user]);

    // Ochrana: Nejsou oznámení, čekáme na ověření, nebo je uživatel blokovaný
    if (isAuthLoading || isLoading || unreadAnnouncements.length === 0 || status !== 'approved') {
        return null;
    }
    
    // Zobrazení všech nepřečtených oznámení (seřazených podle priority)
    return (
        <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
            {unreadAnnouncements.map((announcement) => (
                <div 
                    key={announcement.id}
                    className="flex items-start bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600 dark:border-blue-400 p-4 rounded-lg shadow-md transition-all duration-300"
                >
                    <Bell size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    
                    <div className="flex-grow">
                        <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200">
                           {announcement.title} 
                           {announcement.priority > 1 && <span className="ml-2 text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">DŮLEŽITÉ</span>}
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 whitespace-pre-wrap">
                            {announcement.content}
                        </p>
                    </div>

                    <button
                        onClick={() => handleDismiss(announcement.id)}
                        disabled={isDismissing === announcement.id}
                        className="ml-4 flex-shrink-0 p-1 rounded-full text-blue-600 hover:bg-blue-200 dark:text-blue-400 dark:hover:bg-blue-800 transition disabled:opacity-50"
                        title="Označit jako přečteno"
                    >
                        {isDismissing === announcement.id ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default AnnouncementBanner;