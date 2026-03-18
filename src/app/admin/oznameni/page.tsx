// src/components/Admin/AdminAnnouncementManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client'; // Předpokládá se existující Supabase klienta
import { Plus, Edit, Trash2, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Předpokládá se existující AuthContext

// --- TYPY DAT ---
interface Announcement {
    id: string;
    title: string;
    content: string;
    is_active: boolean;
    priority: number;
    target_role: 'all' | 'admin' | 'user';
    created_at: string;
}

// --- KOMPONENTA MODALU PRO PŘIDÁNÍ/EDITACI ---
interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: Announcement | null; // null pro přidání, data pro editaci
    onSaveSuccess: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, initialData, onSaveSuccess }) => {
    const [formData, setFormData] = useState<Omit<Announcement, 'id' | 'created_at'>>({
        title: '',
        content: '',
        is_active: true,
        priority: 1,
        target_role: 'all',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Načtení dat při otevření modalu pro editaci
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                content: initialData.content,
                is_active: initialData.is_active,
                priority: initialData.priority,
                target_role: initialData.target_role,
            });
        } else {
            // Reset pro přidání nového
            setFormData({ title: '', content: '', is_active: true, priority: 1, target_role: 'all' });
        }
        setError(null);
    }, [initialData]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!formData.title || !formData.content) {
            setError('Titulek a obsah nesmí být prázdné.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (initialData) {
                // EDITACE EXISTUJÍCÍHO
                const { error: updateError } = await supabase
                    .from('portal_announcements')
                    .update(formData)
                    .eq('id', initialData.id);

                if (updateError) throw updateError;
            } else {
                // PŘIDÁNÍ NOVÉHO
                const { error: insertError } = await supabase
                    .from('portal_announcements')
                    .insert(formData);

                if (insertError) throw insertError;
            }

            onSaveSuccess();
            onClose();

        } catch (err: any) {
            console.error('Chyba při ukládání oznámení:', err);
            setError(`Chyba: ${err.message || 'Nepodařilo se uložit oznámení.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
            onClick={onClose} 
        >
            <div 
                className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl max-w-lg w-full transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()} 
            >
                <h2 className="text-2xl font-bold mb-6 text-blue-600 dark:text-blue-300">
                    {initialData ? 'Editovat' : 'Vytvořit Nové'} Oznámení
                </h2>
                
                <div className="space-y-4">
                    
                    {/* Titulek */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Titulek</label>
                        <input 
                            type="text" 
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100" 
                            disabled={isSaving}
                        />
                    </div>
                    
                    {/* Obsah */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Obsah (podporuje jednoduché formátování)</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            rows={4}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100" 
                            disabled={isSaving}
                        />
                    </div>

                    {/* Priorita a Cílová role */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Priorita (1 = nejvyšší)</label>
                            <input 
                                type="number" 
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                                min="1"
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100" 
                                disabled={isSaving}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Cílová Role</label>
                            <select 
                                value={formData.target_role}
                                onChange={(e) => setFormData(prev => ({ ...prev, target_role: e.target.value as 'all' | 'admin' | 'user' }))}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100" 
                                disabled={isSaving}
                            >
                                <option value="all">Všichni</option>
                                <option value="user">Pouze Schválení Uživatelé</option>
                                <option value="admin">Pouze Admini</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Aktivní stav */}
                    <div className="flex items-center">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-zinc-700 dark:border-zinc-600"
                            disabled={isSaving}
                        />
                        <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700 dark:text-zinc-300">
                            Aktivní (Viditelné pro uživatele)
                        </label>
                    </div>
                </div>

                {/* Zpráva o chybě */}
                {error && (
                    <div className="mt-4 p-3 flex items-center bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg text-sm">
                        <XCircle size={18} className="mr-2" /> {error}
                    </div>
                )}

                {/* Tlačítka */}
                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 transition disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Zavřít
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin mr-2" /> Ukládám...
                            </>
                        ) : 'Uložit Oznámení'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ======================================================================
// === HLAVNÍ KOMPONENTA PRO SPRÁVU OZNÁMENÍ ===
// ======================================================================

const AdminAnnouncementManager: React.FC = () => {
    const { role } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Stav pro modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Announcement | null>(null);

    // Načtení oznámení
    const fetchAnnouncements = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        // Zde by měla být kontrola, zda je uživatel admin.
        if (role !== 'admin') {
            setError('Přístup odepřen: Musíte být administrátor.');
            setIsLoading(false);
            return;
        }

        const { data, error: fetchError } = await supabase
            .from('portal_announcements')
            .select('*')
            .order('priority', { ascending: true })
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Chyba při načítání oznámení:', fetchError);
            setError('Nepodařilo se načíst oznámení.');
            setAnnouncements([]);
        } else {
            setAnnouncements(data || []);
        }
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // Otevření modalu pro editaci
    const handleEdit = (announcement: Announcement) => {
        setEditingData(announcement);
        setIsModalOpen(true);
    };

    // Otevření modalu pro nové oznámení
    const handleAdd = () => {
        setEditingData(null);
        setIsModalOpen(true);
    };
    
    // Smazání
    const handleDelete = async (id: string) => {
        if (!window.confirm('Opravdu chcete toto oznámení trvale smazat?')) return;
        
        setIsLoading(true);
        try {
            // Smazání samotného oznámení
            const { error: deleteAnnounceError } = await supabase
                .from('portal_announcements')
                .delete()
                .eq('id', id);

            if (deleteAnnounceError) throw deleteAnnounceError;
            
            // OPTIONAL: Smazání všech záznamů o přečtení pro toto oznámení
            // Supabase Cascade Delete by se mělo postarat o smazání záznamů z 'user_announcement_reads'
            
            await fetchAnnouncements(); // Obnovení seznamu
            
        } catch (err: any) {
            setError(`Chyba při mazání: ${err.message || 'Nepodařilo se smazat.'}`);
        } finally {
            setIsLoading(false);
        }
    };


    if (role !== 'admin') {
        return <div className="p-6 text-red-500">Administrátorská sekce. Přístup odepřen.</div>;
    }

    return (
        <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 rounded-xl shadow-lg">
            <header className="flex justify-between items-center mb-6 border-b pb-3 dark:border-zinc-700">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-zinc-50">
                    Správa Oznámení
                </h3>
                <button
                    onClick={handleAdd}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                    disabled={isLoading}
                >
                    <Plus size={20} className="mr-2" /> Nové Oznámení
                </button>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                        <thead className="bg-gray-50 dark:bg-zinc-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Priorita</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Titulek</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Cíl</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Aktivní</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">Akce</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
                            {announcements.map((announcement) => (
                                <tr key={announcement.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-zinc-50">{announcement.priority}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-zinc-200 font-semibold max-w-xs truncate" title={announcement.content}>
                                        {announcement.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-zinc-200">{announcement.target_role.toUpperCase()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${announcement.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {announcement.is_active ? 'Ano' : 'Ne'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleEdit(announcement)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition"
                                            title="Editovat"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(announcement.id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition"
                                            title="Smazat"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <AnnouncementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingData}
                onSaveSuccess={fetchAnnouncements}
            />
        </div>
    );
};

export default AdminAnnouncementManager;