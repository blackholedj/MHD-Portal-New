// src/app/admin/users/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';

// --- TYPY DAT Z DATABÁZE ---
interface Profile {
  id: string; // Toto je UID uživatele
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'user';
  status: 'approved' | 'pending';
  is_blocked: boolean;
}

const UserManagementPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // --- FUNKCE PRO NAČTENÍ PROFILŮ ---
  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Načtení dat z tabulky 'profiles' a spojení s e-mailem z 'auth.users'
    // POZNÁMKA: Pro získání e-mailu musíte mít v Supabase nastavenou RLS politiku
    // v tabulce 'profiles', která adminovi povolí SELECT na sloupec 'email'.
    const { data: profilesData, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, is_blocked, email') // Předpokládáme, že 'email' je dostupný přes RLS
      .order('full_name', { ascending: true });

    if (fetchError) {
      console.error('Chyba při načítání profilů:', fetchError);
      setError('Nepodařilo se načíst uživatelské profily.');
      setIsLoading(false);
      return;
    }
    
    // Pokud je email součástí profiles (díky RLS), je to Profile[]
    setProfiles(profilesData as Profile[]);
    setIsLoading(false);
  }, [user]);
  
  // --- FUNKCE PRO AKTUALIZACI PROFILU ---
  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    if (!user) return; // Zajištění, že je admin přihlášen

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(`Chyba při aktualizaci profilu ${id}: ${updateError.message}`);
      return;
    }

    // Aktualizujeme stav lokálně bez opětovného načítání
    setProfiles(prev => 
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
    setError(null); // Vymažeme případnou předchozí chybu
  };

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <GridLoader color="#0066ff" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">Chyba: {error}</div>;
  }
  
  // --- RENDERING TABULKY ---
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold mb-6 border-b pb-2">Správa Uživatelských Rolí a Stavů</h2>
      
      {profiles.length === 0 ? (
        <p>Nebyli nalezeni žádní uživatelé k zobrazení.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jméno / Email</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stav (Approved)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Blokování</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  {/* Jméno a Email */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{profile.full_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{profile.email}</div>
                  </td>
                  
                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <select
                      value={profile.role}
                      onChange={(e) => updateProfile(profile.id, { role: e.target.value as 'admin' | 'user' })}
                      className={`p-1 rounded border ${profile.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      <option value="user">USER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </td>

                  {/* Stav (Status) */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => updateProfile(profile.id, { status: profile.status === 'approved' ? 'pending' : 'approved' })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        profile.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {profile.status.toUpperCase()}
                    </button>
                  </td>

                  {/* Blokování (is_blocked) */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => updateProfile(profile.id, { is_blocked: !profile.is_blocked })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        profile.is_blocked
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                      }`}
                    >
                      {profile.is_blocked ? 'BLOKOVÁN' : 'Aktivní'}
                    </button>
                  </td>

                  {/* Akce */}
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {/* Zde by mohly být další akce, např. reset hesla */}
                    <a href={`mailto:${profile.email}`} className="text-indigo-600 hover:text-indigo-900">Kontakt</a>
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