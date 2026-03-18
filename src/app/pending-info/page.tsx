// src/app/user-portal/pending-info/page.tsx
'use client';
import React from 'react';

// ----------------------------------------------------------------------
// --- KOMPONENTA STRÁNKY S INFORMACEMI O ČEKÁNÍ NA SCHVÁLENÍ ---
// ----------------------------------------------------------------------
const PendingInfoPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50 p-6 text-center">
            <h1 className="text-4xl font-bold text-yellow-700 mb-4">⏳ Čekání na schválení</h1>
            <p className="text-lg text-gray-700">
                Váš účet byl úspěšně vytvořen a čeká na schválení administrátorem. 
                Jakmile bude váš přístup schválen, získáte plný přístup k jízdním řádům a dokumentům.
            </p>
            <p className="mt-4 text-sm text-gray-500">
                Děkujeme za trpělivost.
            </p>
        </div>
    );
};
export default PendingInfoPage;