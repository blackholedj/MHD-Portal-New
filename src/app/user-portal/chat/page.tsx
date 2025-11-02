// src/app/user-portal/chat/page.tsx

'use client';

import React from 'react';
import ChatComponent from '@/components/chat/ChatComponent'; // Zde bude hlavní logika
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';

const ChatPage = () => {
  // Kontext pro získání informací o uživateli a načítacích stavech
  const { user, status, role, isLoading } = useAuth(); 
  //console.log('ChatPage render - user:', user, 'status:', status, 'isLoading:', isLoading);
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <GridLoader color="#4F46E5" size={15} />
            <p className='ml-4 text-gray-700'>Načítám chat...</p>
        </div>
    );
  }

  // Zde by měla zasáhnout ochrana v layout.tsx pro pending/blocked,
  // ale pro jistotu zkontrolujeme status (ačkoliv by RLS zablokovalo data)
  if (!user || status !== 'approved') {
    return (
        <div className="p-8 text-center bg-white rounded-lg shadow-md mt-10">
            <h1 className="text-2xl text-red-600">Přístup odepřen</h1>
            <p className="text-gray-600">Musíte být schválený uživatel pro přístup do chatu.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-4xl font-extrabold mb-6 text-gray-800 border-b pb-2">Komunikační Kanál (Chat)</h1>
      <p className="text-lg text-gray-600 mb-6">
        Prostor pro rychlou komunikaci mezi řidiči a administrátory.
      </p>
      
      {/* Hlavní chat komponenta */}
      <div className="max-w-4xl mx-auto h-[70vh] bg-white shadow-xl rounded-xl flex flex-col">
        <ChatComponent 
            currentUserId={user.id} 
        />
      </div>

    </div>
  );
};

export default ChatPage;