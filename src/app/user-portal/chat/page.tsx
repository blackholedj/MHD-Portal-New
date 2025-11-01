// src/app/user-portal/chat/page.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Typ pro zprávu
interface Message {
  id: number;
  created_at: string;
  user_id: string;
  content: string;
  author_name: string;
}

const ChatPage = () => {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Získání jména autora (pro jednoduchost použijeme email prefix nebo roli)
  const getAuthorName = useCallback((userId: string) => {
    if (userId === user?.id) {
        return `${user.email?.split('@')[0] ?? 'Já'} (${role === 'admin' ? 'Admin' : 'Řidič'})`;
    }
    // V reálném projektu by se zde četlo jméno z tabulky 'profiles'
    return userId.substring(0, 8); // Zkrácené ID pro ostatní
  }, [user, role]);

  // Automatické scrollování na konec chatu
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 1. NAČTENÍ HISTORIE A REALTIME LISTENER
  useEffect(() => {
    if (!user) return;

    // Funkce pro načtení a Realtime Listener
    const setupChat = async () => {
      // Načtení posledních 50 zpráv
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Chyba při načítání historie chatu:', error);
        setLoading(false);
        return;
      }
      
      setMessages(data || []);
      setLoading(false);
      scrollToBottom();
      
      // Nastavení Realtime Listeneru
      const subscription = supabase
        .channel('public:messages') // Sledujeme změny na tabulce 'messages'
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            // Při vložení nové zprávy ji přidáme do stavu
            const newMsg = payload.new as Message;
            setMessages((prevMessages) => [...prevMessages, newMsg]);
            scrollToBottom();
        })
        .subscribe();
        
      return () => {
        // Cleanup: Odhlášení kanálu při odchodu ze stránky
        supabase.removeChannel(subscription);
      };
    };

    setupChat();
    
    // Zajištění scrollu při prvním načtení a při každé nové zprávě
    setTimeout(scrollToBottom, 300); 

  }, [user]);

  // 2. ODESLÁNÍ ZPRÁVY
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Vymazání vstupu

    // Vložení zprávy do databáze
    const { error } = await supabase
      .from('messages')
      .insert({ 
        user_id: user.id, 
        content: messageContent,
        // Pro Realtime je nutné, abychom poslali rovnou to, co budeme chtít zpětně číst
        author_name: getAuthorName(user.id), 
      });

    if (error) {
      console.error('Chyba při odesílání zprávy:', error);
      // Můžeme zprávu vrátit zpět do vstupu, pokud se nepodařilo odeslat
      setNewMessage(messageContent); 
    }
    // Realtime Listener se postará o přidání zprávy do stavu a zobrazení!
  };
  
  // --- JSX VYKRESLENÍ ---

  if (loading) {
    return <div className="p-8 text-center">Načítání chatu...</div>;
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold p-4 bg-white border-b shadow-sm text-gray-800">
        📢 Provozní Chat ({role === 'admin' ? 'ADMIN' : 'Řidič'})
      </h1>
      
      {/* Okno chatu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md ${
              msg.user_id === user?.id 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
            }`}>
              <p className="text-xs font-semibold mb-1 opacity-80">
                {msg.author_name}
              </p>
              <p className="text-base wrap-break-word">{msg.content}</p>
              <p className="text-xs mt-1 text-right opacity-60">
                {new Date(msg.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {/* Referenční bod pro scroll */}
        <div ref={chatEndRef} />
      </div>

      {/* Vstup pro zprávu */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napište provozní zprávu..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={!user}
          />
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            disabled={!user || !newMessage.trim()}
          >
            Odeslat
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;