// src/app/contact/page.tsx
'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // <-- DŮLEŽITÉ: Import supabase instance

export default function Contact() {
    // ... (ostatní stavy zůstávají stejné)
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');


    // FUNKCE PRO ODESLÁNÍ DO DATABÁZE
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim() || !email.trim() || !message.trim()) {
            setStatus('error'); // Změna statusu pro lepší zpětnou vazbu
            return;
        }

        setStatus('sending');

        const { error } = await supabase
            .from('contact_form')
            .insert({
                name: name.trim(),
                email: email.trim(),
                message: message.trim(),
            });

        if (error) {
            console.error('Chyba při odesílání kontaktu do Supabase:', error);
            setStatus('error');
            // Zobrazit chybovou zprávu jen na 5 sekund
            setTimeout(() => setStatus('idle'), 5000); 
        } else {
            // Úspěch
            setStatus('success');
            setName('');
            setEmail('');
            setMessage('');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    const getButtonText = () => {
        switch (status) {
            case 'sending':
                return 'Odesílám...';
            case 'success':
                return 'Odesláno! ✅';
            case 'error':
                return 'Zkuste to znovu ❌';
            default:
                return 'Odeslat Zprávu';
        }
    };

    // ... (zbytek JSX kódu zůstává stejný)

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
                <div className="lg:grid lg:grid-cols-2">
                    
                    {/* Sekce s Informacemi (beze změny) */}
                    <div className="p-10 bg-blue-700 text-white flex flex-col justify-center">
                        <h2 className="text-3xl font-extrabold mb-4">
                            Kontaktujte nás
                        </h2>
                        <p className="mb-8 opacity-90">
                            Neváhejte se obrátit na administraci s jakýmikoliv dotazy, návrhy nebo technickými problémy.
                        </p>
                        
                        <div className="space-y-6">
                            <div className="flex items-center">
                                <Mail className="w-6 h-6 mr-3 text-blue-300" />
                                <div>
                                    <p className="font-semibold">Email pro podporu</p>
                                    <a href="mailto:preissler.jirik@gmail.com" className="hover:underline opacity-80">
                                        preissler.jirik[@]gmail.com
                                    </a>
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <Phone className="w-6 h-6 mr-3 text-blue-300" />
                                <div>
                                    <p className="font-semibold">Horká linka (Admin)</p>
                                    <a href="tel:+0609112777" className="hover:underline opacity-80">
                                        0609 112 777
                                    </a>
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <MapPin className="w-6 h-6 mr-3 text-blue-300" />
                                <div>
                                    <p className="font-semibold">Sídlo společnosti</p>
                                    <p className="opacity-80">tř.Budovatelů 1395/23, 434 01 Most</p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <MapPin className="w-6 h-6 mr-3 text-blue-300" />
                                <div>
                                    <p className="font-semibold">Stránky společnosti</p>
                                    <p className="opacity-80"><a href="https://www.dpmost.cz/" target='_blank' className="hover:underline opacity-80">
                                        https://www.dpmost.cz/
                                    </a></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sekce s Formulářem */}
                    <div className="p-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Rychlá Zpráva
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Jméno</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={status === 'sending'}
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={status === 'sending'}
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Zpráva</label>
                                <textarea
                                    id="message"
                                    rows={4}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={status === 'sending'}
                                />
                            </div>
                            
                            <button
                                type="submit"
                                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white transition duration-200 ${
                                    status === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                    status === 'sending' ? 'bg-gray-500 cursor-not-allowed' :
                                    status === 'error' ? 'bg-red-500 hover:bg-red-600' :
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                                disabled={status !== 'idle'}
                            >
                                <Send className="w-5 h-5 mr-2" />
                                {getButtonText()}
                            </button>
                            
                            {/* Zprávy o stavu */}
                            {status === 'success' && (
                                <p className="text-green-600 text-center font-semibold mt-2">
                                    Děkujeme! Vaše zpráva byla úspěšně odeslána.
                                </p>
                            )}
                            {status === 'error' && (
                                <p className="text-red-600 text-center font-semibold mt-2">
                                    Odeslání se nezdařilo. Zkontrolujte připojení a zkuste to znovu.
                                </p>
                            )}
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}