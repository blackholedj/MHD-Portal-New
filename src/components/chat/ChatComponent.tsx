// src/components/chat/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Send, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  username: string;
}

interface ChatProps {
    currentUserId: string;
   
}

const ChatComponent: React.FC<ChatProps> = ({ currentUserId }) => {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  //console.log("INFORMACE O USER: ", user?.user_metadata.full_name);
  // --------------------------------------------------
  // 1. ZÍSKÁNÍ A REALTIME AKTUALIZACE ZPRÁV
  // --------------------------------------------------
  // Získání jména autora (pro jednoduchost použijeme email prefix nebo roli)
  const getAuthorName = useCallback((userId: string) => {
    if (userId === user?.id) {
        return `${user.email?.split('@')[0] ?? 'Já'} (${role === 'admin' ? 'Admin' : 'Řidič'})`;
    }
    // V reálném projektu by se zde četlo jméno z tabulky 'profiles'
    return userId.substring(0, 8); // Zkrácené ID pro ostatní
  }, [user, role]);

  // Načte prvních 50 zpráv
  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`id, user_id, content, created_at, author_name`)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Chyba při načítání zpráv:', error);
      setError('Nepodařilo se načíst zprávy.');
    } else {
      setMessages(data as Message[]);
    }
    setLoading(false);
  }, []);
  
  // Posun na konec chatu
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);
  
  // Zajištění automatického posunu při každé aktualizaci (odeslání/realtime)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  // **KLÍČOVÉ PRO AUTOMATICKOU AKTUALIZACI: Supabase Realtime**
  useEffect(() => {
    const channel = supabase
      .channel('chat-public') // Název kanálu
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' }, // Sledujeme INSERT/DELETE na tabulce messages
        (payload) => {
          // Úspěšná operace: Automatická aktualizace zobrazení zpráv
          // Pro jednoduchost celé řešení znovu načteme, ale u velkého chatu 
          // by se optimalizovalo na pouhé přidání/odebrání jedné zprávy.
          fetchMessages(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  // --------------------------------------------------
  // 2. ODESLÁNÍ ZPRÁVY
  // --------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    // Poznámka: Kontrola, zda uživatel.username existuje je nezbytná.
    // Předpokládáme, že je načteno v AuthContextu.
    if (!user.user_metadata.full_name) {
        setError('Nelze odeslat zprávu: Chybí uživatelské jméno.');
        return;
    }

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        author_name: getAuthorName(user.id), 
        content: newMessage.trim(),
      });

    if (insertError) {
      setError('Chyba při odesílání zprávy.');
      console.error(insertError);
    } else {
      // Realtime zajistí aktualizaci, jen vyčistíme input
      setNewMessage(''); 
    }
  };
  
  // --------------------------------------------------
  // 3. MAZÁNÍ ZPRÁVY (POUZE PRO ADMINY)
  // --------------------------------------------------
  const handleDeleteMessage = async (messageId: string) => {
    if (!role || !confirm('Opravdu chcete tuto zprávu smazat?')) return;

    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      setError('Chyba při mazání zprávy.');
      console.error(deleteError);
    } 
    // Realtime zajistí aktualizaci, není potřeba manuálně volat fetchMessages.
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Načítám zprávy...</div>;
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Oblast zpráv */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.user_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md relative group ${
                msg.user_id === currentUserId 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 rounded-tl-none border'
            }`}>
              
              {/* Jméno a čas */}
              <div className="text-xs mb-1 font-semibold opacity-80 flex justify-between items-center">
                <span className={msg.user_id === currentUserId ? 'text-blue-200' : 'text-gray-500'}>
                    {msg.user_id === currentUserId ? ' Já ' : msg.author_name}
                </span>
                <span className={msg.user_id === currentUserId ? 'text-blue-300' : 'text-gray-400'}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {/* Obsah zprávy */}
              <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
              {/* Tlačítko pro mazání (pouze admin) */}
              {role==="admin" && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Smazat zprávu (Admin)"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} /> {/* Pomocný prvek pro posun */}
      </div>

      {/* Vstupní pole */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Napište zprávu..."
          className="flex-grow border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-3"
          disabled={!user || !user.user_metadata.full_name}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !user || !user.user_metadata.full_name}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;