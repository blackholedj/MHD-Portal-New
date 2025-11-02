// src/app/admin/contact/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Mail, Trash2, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

// Typ pro jednu zprávu z tabulky contact_submissions
interface Submission {
    id: string;
    name: string;
    email: string;
    message: string;
    visible: boolean;
    created_at: string;
}

const ContactManager: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubmissions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // Načteme všechny zprávy, nejnovější první
        const { data, error } = await supabase
            .from('contact_form')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Chyba při načítání zpráv:', error);
            setError('Nepodařilo se načíst zprávy. Zkontrolujte RLS politiky (SELECT pro admina).');
            setSubmissions([]);
        } else {
            setSubmissions(data || []);
        }
        setIsLoading(false);
    }, []);

    // Načtení dat při prvním renderu
    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    // --- MANIPULAČNÍ FUNKCE ---

    const toggleReadStatus = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        // Optimistická aktualizace UI
        setSubmissions(prev => 
            prev.map(sub => sub.id === id ? { ...sub, visible: newStatus } : sub)
        );

        const { error } = await supabase
            .from('contact_form')
            .update({ visible: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Chyba při změně statusu:', error);
            // V případě chyby vrátit stav zpět
            setSubmissions(prev => 
                prev.map(sub => sub.id === id ? { ...sub, visible: currentStatus } : sub)
            );
            alert('Chyba při aktualizaci statusu: ' + error.message);
        }
    };

    const deleteSubmission = async (id: string) => {
        if (!confirm('Opravdu chcete tuto kontaktní zprávu smazat?')) {
            return;
        }

        const originalSubmissions = submissions;
        
        // Optimistická aktualizace UI
        setSubmissions(prev => prev.filter(sub => sub.id !== id));

        const { error } = await supabase
            .from('contact_form')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Chyba při mazání zprávy:', error);
            setSubmissions(originalSubmissions); // Vrátit zprávy v případě chyby
            alert('Chyba při mazání zprávy: ' + error.message);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /> Načítám zprávy...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-600 border border-red-300 bg-red-50 rounded-lg">Chyba: {error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                <Mail className="w-6 h-6 mr-2 text-blue-600" />
                Kontaktní Zprávy ({submissions.length})
            </h3>

            {submissions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-3" />
                    Všechny zprávy jsou vyřízeny. Vypadá to tu čistě!
                </div>
            ) : (
                <div className="space-y-4">
                    {submissions.map((sub) => (
                        <div
                            key={sub.id}
                            className={`p-4 border rounded-lg transition duration-200 ${
                                sub.visible ? 'bg-gray-100 border-gray-200 opacity-80' : 'bg-yellow-50 border-yellow-300 font-medium'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-lg text-gray-900">
                                        Od: <span className="font-bold">{sub.name}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <a href={`mailto:${sub.email}`} className="hover:underline">{sub.email}</a>
                                        {' | '}
                                        <span title="Čas odeslání">
                                            {new Date(sub.created_at).toLocaleString('cs-CZ')}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0">
                                    <button
                                        onClick={() => toggleReadStatus(sub.id, sub.visible)}
                                        className={`p-2 rounded-full transition duration-150 ${
                                            sub.visible ? 'text-gray-500 hover:bg-gray-200' : 'text-blue-600 hover:bg-blue-100'
                                        }`}
                                        title={sub.visible ? 'Označit jako nepřečtené' : 'Označit jako přečtené'}
                                    >
                                        {sub.visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => deleteSubmission(sub.id)}
                                        className="p-2 rounded-full text-red-500 hover:bg-red-100 transition duration-150"
                                        title="Smazat zprávu"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className={`mt-3 pt-3 border-t ${sub.visible ? 'border-gray-300' : 'border-yellow-400'}`}>
                                <p className="whitespace-pre-wrap text-gray-700">{sub.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactManager;