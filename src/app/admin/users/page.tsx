// src/app/admin/users/page.tsx - Modernizovaná správa uživatelů s filtry (záložkami)
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import { Check, UserX, UserCheck, X } from 'lucide-react'; // Ikony pro akce

// --- TYPY DAT Z DATABÁZE ---
interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'blocked'; // Doplněno 'blocked' pro přehlednost
    is_blocked: boolean; // Zůstává pro blokování na úrovni profilu
}

// Typ pro záložky/filtry
type UserFilter = 'pending' | 'approved' | 'blocked' | 'all';

const UserManagementPage = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<UserFilter>('pending'); // Začínáme u Neschválených
    const { user } = useAuth();

    // Zajišťujeme správné mapování stavu, pokud status neobsahuje 'blocked'
    const formatProfiles = (data: Profile[]): Profile[] => {
        return data.map(p => ({
            ...p,
            role: p.role as 'admin' | 'user',
            status: p.is_blocked ? 'blocked' : (p.status as 'pending' | 'approved' | 'blocked'),
        }));
    };

    // --- FUNKCE PRO NAČTENÍ PROFILŮ ---
    const fetchProfiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const { data: profilesData, error: fetchError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, status, is_blocked')
            .order('full_name', { ascending: true });

        if (fetchError) {
            console.error('Chyba při načítání profilů:', fetchError);
            setError('Nepodařilo se načíst uživatelské profily.');
        } else {
            setProfiles(formatProfiles(profilesData || []));
        }
        setIsLoading(false);
    }, []);

    // --- FUNKCE PRO AKTUALIZACI PROFILU ---

    const updateProfile = async (id: string, updates: Partial<Profile>) => {
        if (!user) return;

        setError(null);

        // Zatím podporujeme pouze změny schválení.
        // Role a blokování budou mít samostatné zabezpečené RPC.
        if (
            updates.role !== undefined ||
            updates.is_blocked !== undefined ||
            updates.full_name !== undefined ||
            (updates.status !== 'approved' && updates.status !== 'pending')
        ) {
            setError(
                'Tato administrátorská operace zatím není podporována.'
            );
            return;
        }

        const { error: updateError } = await supabase.rpc(
            'admin_update_user_status',
            {
                p_user_id: id,
                p_new_status: updates.status,
            }
        );

        if (updateError) {
            setError(
                `Chyba při aktualizaci profilu ${id}: ${updateError.message}`
            );
            return;
        }

        // Načteme skutečný stav z databáze.
        await fetchProfiles();
    };


    const setUserBlocked = async (id: string, blocked: boolean) => {
        if (!user) return;

        setError(null);

        const { error: updateError } = await supabase.rpc(
            'admin_set_user_blocked',
            {
                p_user_id: id,
                p_blocked: blocked,
            }
        );

        if (updateError) {
            setError(
                `Chyba při změně blokování uživatele ${id}: ${updateError.message}`
            );
            return;
        }

        // Obnovíme skutečný stav profilů z databáze.
        await fetchProfiles();
    };


    const setUserRole = async (
        id: string,
        newRole: 'admin' | 'user'
    ) => {
        if (!user) return;

        setError(null);

        const { error: updateError } = await supabase.rpc(
            'admin_set_user_role',
            {
                p_user_id: id,
                p_new_role: newRole,
            }
        );

        if (updateError) {
            setError(
                `Chyba při změně role uživatele ${id}: ${updateError.message}`
            );
            return;
        }

        await fetchProfiles();
    };

    useEffect(() => {
        let active = true;

        // Úvodní načtení. Opakované načítání po RPC
        // nadále zajišťuje původní fetchProfiles().
        void Promise.resolve(
            supabase
                .from('profiles')
                .select('id, full_name, email, role, status, is_blocked')
                .order('full_name', { ascending: true })
        )
            .then(({ data, error: fetchError }) => {
                if (!active) return;

                if (fetchError) {
                    console.error('Chyba při načítání profilů:', fetchError);
                    setError('Nepodařilo se načíst uživatelské profily.');
                } else {
                    setError(null);
                    setProfiles(formatProfiles(data || []));
                }

                setIsLoading(false);
            })
            .catch((error: unknown) => {
                if (!active) return;

                console.error('Chyba při načítání profilů:', error);
                setError('Nepodařilo se načíst uživatelské profily.');
                setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);


    // --- FILTRACE PROFILŮ PODLE AKTIVNÍ ZÁLOŽKY ---
    const filteredProfiles = useMemo(() => {
        if (activeFilter === 'all') return profiles;

        return profiles.filter(p => {
            if (activeFilter === 'blocked') {
                // Filtrujeme, pokud je uživatel blokovaný
                return p.is_blocked;
            }
            if (activeFilter === 'approved') {
                // Filtrujeme, pokud je schválený A NENÍ blokovaný
                return p.status === 'approved' && !p.is_blocked;
            }
            if (activeFilter === 'pending') {
                 // Filtrujeme, pokud čeká na schválení A NENÍ blokovaný
                return p.status === 'pending' && !p.is_blocked;
            }
            return false;
        });
    }, [profiles, activeFilter]);

    // Definice záložek
    const tabs: { name: UserFilter, label: string, count: number }[] = useMemo(() => [
        { name: 'pending', label: 'Neschválení', count: profiles.filter(p => p.status === 'pending' && !p.is_blocked).length },
        { name: 'approved', label: 'Schválení', count: profiles.filter(p => p.status === 'approved' && !p.is_blocked).length },
        { name: 'blocked', label: 'Blokovaní', count: profiles.filter(p => p.is_blocked).length },
        { name: 'all', label: 'Všichni', count: profiles.length },
    ], [profiles]);


    // --- RENDERING OVLÁDÁNÍ STAVU A CHYB ---
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <GridLoader color="#0066ff" />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded dark:bg-red-900 dark:text-red-300">Chyba: {error}</div>;
    }

    const getStatusStyle = (profile: Profile) => {
        if (profile.is_blocked) return 'bg-red-500 text-white';
        if (profile.status === 'approved') return 'bg-green-100 text-green-800';
        if (profile.status === 'pending') return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };


    // --- RENDERING KOMPONENTY ---
    return (
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b pb-2">Správa Uživatelů 👤</h2>

            {/* Navigace záložkami (Filtry) */}
            <nav className="mb-6 border-b border-gray-200 dark:border-zinc-700">
                <div className="flex space-x-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveFilter(tab.name)}
                            className={`
                                py-2 px-4 text-sm font-semibold transition-colors duration-150 relative
                                ${activeFilter === tab.name
                                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                                }
                            `}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
            </nav>

            {/* Obsah tabulky */}
            {filteredProfiles.length === 0 ? (
                <p className="p-4 text-gray-500 dark:text-zinc-400">V této sekci nejsou žádní uživatelé k zobrazení.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                        <thead className="bg-gray-50 dark:bg-zinc-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Uživatel</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Stav</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Akce</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
                            {filteredProfiles.map((profile) => (
                                <tr
                                    key={profile.id}
                                    className={`
                                        transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50
                                        ${profile.is_blocked ? 'opacity-70' : ''}
                                    `}
                                >
                                    {/* Jméno a Email */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{profile.full_name || 'N/A'}</div>
                                        <div className="text-sm text-gray-500 dark:text-zinc-400">{profile.email}</div>
                                    </td>

                                    {/* Role (Select) */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <select
                                            value={profile.role}
                                            onChange={(e) =>
                                                setUserRole(
                                                    profile.id,
                                                    e.target.value as 'admin' | 'user'
                                                )
                                            }
                                            className={`p-1 rounded border text-sm font-medium dark:bg-zinc-700 dark:border-zinc-600
                                            ${profile.role === 'admin' ? 'bg-red-100 text-red-700 dark:text-red-300' : 'bg-green-100 text-green-700 dark:text-green-300'}`}
                                            disabled={profile.is_blocked}
                                        >
                                            <option value="user">USER</option>
                                            <option value="admin">ADMIN</option>
                                        </select>
                                    </td>

                                    {/* Stav (Status Label) */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(profile)}`}>
                                            {profile.status.toUpperCase()}
                                        </span>
                                    </td>

                                    {/* Akce */}
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">

                                        {/* Tlačítko pro Schválení/Neschválení */}
                                        {profile.status !== 'approved' && !profile.is_blocked && (
                                            <button
                                                onClick={() => updateProfile(profile.id, { status: 'approved' })}
                                                className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                                                title="Schválit uživatele"
                                            >
                                                <UserCheck size={20} />
                                            </button>
                                        )}
                                        {profile.status === 'approved' && !profile.is_blocked && (
                                            <button
                                                onClick={() => updateProfile(profile.id, { status: 'pending' })}
                                                className="p-2 rounded-full text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition"
                                                title="Přesunout do čekajících"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}

                                        {/* Tlačítko pro Blokování/Odblokování */}
                                        <button
                                            onClick={() => setUserBlocked(profile.id, !profile.is_blocked)}
                                            className={`p-2 rounded-full transition ${
                                                profile.is_blocked
                                                ? 'text-white bg-red-600 hover:bg-red-700'
                                                : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50'
                                            }`}
                                            title={profile.is_blocked ? 'Odblokovat uživatele' : 'Blokovat uživatele'}
                                        >
                                            {profile.is_blocked ? <Check size={20} /> : <UserX size={20} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;