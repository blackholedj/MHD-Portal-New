// src/app/user-portal/dokumenty/page.tsx
'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GridLoader } from 'react-spinners';
import Link from 'next/link';
// Přidány ikony pro Úpravu a Smazání
import { FileText, BookOpen, Settings, Info, Download, Edit, Trash2, X } from 'lucide-react'; 

// --- TYPY DAT Z DATABÁZE ---
interface Document {
  id: string;
  title: string;
  description: string | null;
  file_path: string; // Cesta k souboru ve Storage
  admin_only: boolean;
  type: 'smernice' | 'manualy' | 'jine';
  created_at: string;
}

type DocumentType = 'all' | 'smernice' | 'manualy' | 'jine';

// ----------------------------------------------------------------------
// --- PLACEHOLDER PRO MODAL PRO ÚPRAVU (musí být vytvořen jako samostatná komponenta) ---
// ----------------------------------------------------------------------

interface EditDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document | null;
    onSave: (updatedDoc: Partial<Document>) => void;
}

// 💡 Zde byste normálně importovali skutečnou komponentu modalu.
// V tomto příkladu necháme jednoduchý placeholder pro správnou funkci.
const EditDocumentModal: React.FC<EditDocumentModalProps> = ({ isOpen, onClose, document, onSave }) => {
    // Lokální stav pro data formuláře, inicializovaný z `document`
    const [formData, setFormData] = useState<Partial<Document>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Reset formuláře při otevření modalu nebo změně dokumentu
        if (document) {
            setFormData({
                title: document.title,
                description: document.description,
                type: document.type,
                admin_only: document.admin_only,
            });
        }
    }, [document]);

    if (!isOpen || !document) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        // Speciální ošetření pro checkbox
        const inputValue = type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked
            : value;

        setFormData(prev => ({
            ...prev,
            [name]: inputValue,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        // Filtrování pouze změněných hodnot
        const changes: Partial<Document> = {};
        let isChanged = false;
        
        (['title', 'description', 'type', 'admin_only'] as Array<keyof Document>).forEach(key => {
            // TypeScript bezpečné porovnání
            const currentValue = document[key];
            const newValue = formData[key];
            
            // Kontrola změn (zejména pro null/string a boolean)
            if (newValue !== undefined && newValue !== currentValue) {
                changes[key] = newValue as any;
                isChanged = true;
            }
        });

        try {
            if (isChanged) {
                await onSave(changes); // Volání funkce pro uložení v DocumentsPage
            } else {
                alert('Nebyly zjištěny žádné změny k uložení.');
                onClose();
            }
        } catch (err) {
            console.error(err);
            alert('Chyba při ukládání dokumentu.');
        } finally {
            setIsSaving(false);
        }
    };

    // Tailwind pro dark mode
    const inputClasses = "block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100 transition";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-2xl max-w-lg w-full relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100"
                    disabled={isSaving}
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Upravit dokument</h2>
                
                <form onSubmit={handleSubmit}>
                    {/* Název */}
                    <div className="mb-4">
                        <label htmlFor="title" className={labelClasses}>Název</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title || ''}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                        />
                    </div>

                    {/* Popis */}
                    <div className="mb-4">
                        <label htmlFor="description" className={labelClasses}>Popis (volitelné)</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            className={`${inputClasses} h-20`}
                        />
                    </div>

                    {/* Typ */}
                    <div className="mb-4">
                        <label htmlFor="type" className={labelClasses}>Typ Dokumentu</label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type || 'jine'}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                        >
                            <option value="smernice">Směrnice</option>
                            <option value="manualy">Manuály</option>
                            <option value="jine">Jiné</option>
                        </select>
                    </div>

                    {/* Pouze pro Adminy */}
                    <div className="mb-6 flex items-center">
                        <input
                            type="checkbox"
                            id="admin_only"
                            name="admin_only"
                            checked={!!formData.admin_only} // !! pro zajištění boolean hodnoty
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="admin_only" className="ml-2 text-sm font-medium text-gray-700 dark:text-zinc-300">
                            Dokument je pouze pro Adminy
                        </label>
                    </div>

                    {/* Tlačítka */}
                    <div className="mt-4 flex justify-end space-x-2">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="px-4 py-2 bg-gray-300 dark:bg-zinc-600 text-gray-800 dark:text-zinc-100 rounded hover:bg-gray-400 transition"
                            disabled={isSaving}
                        >
                            Zrušit
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition disabled:bg-blue-400"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Ukládání...' : 'Uložit změny'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// --- POMOCNÉ FUNKCE A IKONY (BEZ ZMĚN) ---
// ----------------------------------------------------------------------

const getTypeIcon = (type: DocumentType) => {
    // Upravené barvy pro dark mód
    switch (type) {
        case 'smernice':
            return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
        case 'manualy':
            return <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />;
        case 'jine':
            return <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
        default:
            return <FileText className="w-5 h-5 text-gray-500 dark:text-zinc-400" />;
    }
};

const getTypeName = (type: DocumentType) => {
    switch (type) {
        case 'smernice':
            return 'Směrnice';
        case 'manualy':
            return 'Manuály';
        case 'jine':
            return 'Jiné dokumenty';
        default:
            return 'Všechny typy';
    }
};

// ----------------------------------------------------------------------
// --- HLAVNÍ KOMPONENTA DOKUMENTŮ (ZAPOJENÍ ADMIN LOGIKY A MODALU) ---
// ----------------------------------------------------------------------

const DocumentsPage = () => {
    const { user, isLoading: isAuthLoading, status, role } = useAuth();
    // 💡 Získání role Admin (předpoklad: role je na objektu user)
    const isAdmin = role === 'admin'; 
    
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [selectedType, setSelectedType] = useState<DocumentType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // 💡 Stavy pro Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);

    const getDownloadUrl = (filePath: string) => {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      return data.publicUrl;
    };

    const fetchDocuments = useCallback(async () => {
      setIsLoadingData(true);
      setError(null);

      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

        // 💡 Úprava: Admin vidí vše, User pouze ne-admin_only
        if (!isAdmin) {
            query = query.eq('admin_only', false);
        }

      if (selectedType !== 'all') {
        query = query.eq('type', selectedType);
      }
      
      if (searchTerm) {
          query = query.ilike('title', `%${searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Chyba při načítání dokumentů:', fetchError);
        setError('Nepodařilo se načíst dokumenty. Zkontrolujte RLS politiky.');
      } else {
        setDocuments(data as Document[] || []);
      }
      setIsLoadingData(false);
    }, [selectedType, searchTerm, isAdmin]); // isAdmin přidán do závislostí

    useEffect(() => {
      if (!isAuthLoading && user) {
          fetchDocuments();
      }
    }, [isAuthLoading, user, fetchDocuments]);
    
    // --- ADMIN FUNKCE ---

    const handleEdit = (doc: Document) => {
        if (!isAdmin) return;
        setEditingDocument(doc);
        setIsModalOpen(true);
    };

    const handleSaveEdit = async (updatedDoc: Partial<Document>) => {
        if (!editingDocument) return;

        // V reálné aplikaci by zde bylo volání API pro uložení změn
        console.log('Aktualizace dokumentu:', editingDocument.id, updatedDoc);

        // Zde by mělo být volání do Supabase:
        /*
        const { error } = await supabase
            .from('documents')
            .update(updatedDoc)
            .eq('id', editingDocument.id);

        if (error) {
            alert('Chyba při ukládání: ' + error.message);
            return;
        }
        */

        // Pro ukázku aktualizujeme lokální stav
        setDocuments(prevDocs => prevDocs.map(d => 
            d.id === editingDocument.id ? { ...d, ...updatedDoc } : d
        ));
        setIsModalOpen(false);
        setEditingDocument(null);
        // Po skutečné úpravě je dobré zavolat fetchDocuments() pro znovunačtení ze serveru
        // fetchDocuments(); 
        //alert('Dokument upraven (simulace).');
    };

    const handleDelete = async (docId: string, filePath: string) => {
        if (!isAdmin || !confirm('Opravdu chcete dokument Smazat? Tato akce je nevratná.')) return;

        try {
            setIsLoadingData(true);
            
            // 1. Smazání souboru ze Supabase Storage
            const { error: storageError } = await supabase.storage
                .from('documents')
                .remove([filePath]);

            if (storageError) throw storageError;

            // 2. Smazání záznamu z tabulky dokumentů
            const { error: dbError } = await supabase
                .from('documents')
                .delete()
                .eq('id', docId);

            if (dbError) throw dbError;

            // 3. Aktualizace stavu po smazání
            setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
            alert('Dokument byl úspěšně smazán.');

        } catch (error) {
            console.error('Chyba při mazání dokumentu:', error);
            alert(`Nepodařilo se smazat dokument: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoadingData(false);
        }
    };
    
    // Loading stavy (úprava pro dark mód)
    if (isAuthLoading || isLoadingData) {
      return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <GridLoader color="#4F46E5" size={10} />
        </div>
      );
    }

    // Chybový stav (úprava pro dark mód)
    if (error) {
      return (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded mx-auto max-w-4xl mt-8">
            <h1 className="font-bold">Chyba:</h1> {error}
        </div>
      );
    }

    // Odepřený přístup (úprava pro dark mód)
    if (!user || status !== 'approved') {
      return (
          <div className="p-8 text-center bg-white dark:bg-zinc-800 rounded-lg shadow-xl mx-auto max-w-md mt-10">
              <h1 className="text-2xl text-red-600 dark:text-red-400 font-bold">Přístup odepřen</h1>
              <p className="text-gray-600 dark:text-zinc-400 mt-2">Musíte být schválený uživatel pro přístup k dokumentům.</p>
          </div>
      );
    }
    
    // Hlavní render
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Nadpis */}
          <h1 className="max-w-6xl mx-auto text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b pb-2">
            Dokumenty {isAdmin && <span className="text-2xl text-red-500">(ADMIN)</span>}
          </h1>
            
            {/* Tlačítko pro Správu (Pouze Admin)
            {isAdmin && (
                <div className="mb-6 flex justify-end">
                    <Link
                        href="/admin/dokumenty/pridat" // Příklad cesty pro přidání nového dokumentu
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        <Settings className="w-5 h-5" />
                        <span>Přidat/Spravovat</span>
                    </Link>
                </div>
            )} */}
          
          {/* Sekce Filtrů a Vyhledávání (Responsivní layout) */}
          <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row gap-4">
                {/* ... filtry beze zmen ... */}
                <div className="w-full md:w-1/3">
                    <label htmlFor="docType" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Typ Dokumentu</label>
                    <select
                        id="docType"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                        className="block w-full border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100 transition"
                    >
                        <option value="all">Všechny typy</option>
                        <option value="smernice">Směrnice</option>
                        <option value="manualy">Manuály</option>
                        <option value="jine">Jiné</option>
                    </select>
                </div>
                <div className="w-full md:w-2/3">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Vyhledat (v názvu)</label>
                    <div className="flex">
                        <input
                            type="text"
                            id="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Hledat manuál nebo směrnici..."
                            className="block w-full border border-gray-300 dark:border-zinc-600 rounded-l-lg shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100 transition"
                        />
                        <button
                            onClick={fetchDocuments}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 transition shrink-0"
                        >
                            Hledej
                        </button>
                    </div>
                </div>
          </div>

          {/* Seznam Dokumentů */}
          {documents.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg text-center text-gray-600 dark:text-zinc-400">
              Nebyly nalezeny žádné dokumenty odpovídající vašim kritériím.
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                // Karta dokumentu
                <div 
                  key={doc.id} 
                  className="bg-white dark:bg-zinc-800 p-4 sm:p-5 rounded-xl shadow flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-xl transition-shadow border border-gray-100 dark:border-zinc-700"
                >
                  <div className="flex items-start space-x-3 sm:space-x-4 w-full sm:w-auto">
                    {getTypeIcon(doc.type as DocumentType)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-zinc-50 truncate">{doc.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{doc.description}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                        Typ: {getTypeName(doc.type as DocumentType)} | Nahráno: {new Date(doc.created_at).toLocaleDateString()}
                          {doc.admin_only && <span className="text-red-500 dark:text-red-400 ml-2 font-semibold">(Admin Only)</span>}
                      </p>
                    </div>
                  </div>
                  
                  {/* Akční Tlačítka (Download + Admin Actions) */}
                  <div className="mt-4 sm:mt-0 sm:ml-6 shrink-0 flex gap-2 w-full sm:w-auto justify-end sm:justify-start">
                        {/* 💡 Admin Tlačítka (Úprava a Smazání) */}
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => handleEdit(doc)} // Otevře modal s daty dokumentu
                                    className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                                    title="Upravit dokument"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(doc.id, doc.file_path)} // Smaže dokument
                                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                    title="Smazat dokument"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        
                        {/* Tlačítko pro stažení */}
                        <Link
                          href={getDownloadUrl(doc.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition w-full sm:w-auto"
                        >
                          <Download className="w-4 h-4" />
                          <span>Stáhnout</span>
                        </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 💡 Vykreslení Modalu pro úpravu */}
        <EditDocumentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            document={editingDocument}
            onSave={handleSaveEdit}
        />
      </div>
    );
};

export default DocumentsPage;