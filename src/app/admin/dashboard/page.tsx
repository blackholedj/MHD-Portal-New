// src/app/admin/dashboard/page.tsx

'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams!
import DocumentUploadForm from './DocumentUploadForm'; // Předpokládáme, že je soubor vedle
import JizdniRadUploadForm from './JizdniRadUploadForm'; // Předpokládáme, že je soubor vedle

const AdminDashboardPage = () => {
    const searchParams = useSearchParams();
    // Čteme parametr 'tab' z URL, defaultní hodnota je 'jizdni-rady'
    const activeTab = searchParams.get('tab') || 'jizdni-rady'; 
    
    // Umožňuje zobrazení správného názvu záložky
    const tabTitle = activeTab === 'dokumenty' ? 'Dokumenty' : 'Jízdní řády';

    // Obsah k zobrazení
    let content;
    if (activeTab === 'dokumenty') {
        content = <DocumentUploadForm />;
    } else {
        // Defaultně nebo pokud je 'jizdni-rady'
        content = <JizdniRadUploadForm />;
    }

    return (
        <div className="space-y-8 bg-white">
            <h2 className="max-w-7xl mx-auto text-2xl font-bold mb-3 text-gray-800 dark:text-gray-100 border-b pb-2 pt-2">
                Správa souborů: {tabTitle}
            </h2>
            
            {/* Navigace záložkami (v layoutu) automaticky změní URL,
                a tato komponenta se překreslí, když se URL změní. */}
            
            {/* Zde se vykreslí vybraný formulář */}
            {content}
            
            {/* Nyní již nepotřebujeme lokální přepínače záložek */}
        </div>
    );
};

export default AdminDashboardPage;