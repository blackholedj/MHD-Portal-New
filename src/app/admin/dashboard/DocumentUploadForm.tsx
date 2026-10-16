// src/app/admin/dashboard/DocumentUploadForm.tsx

'use client';

import React, { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { v4 as uuidv4 } from 'uuid'; 

type DocumentType = 'smernice' | 'manualy' | 'jine';

const DocumentUploadForm = () => {
  const { user } = useAuth();
  
  // Stavy pro formulářová pole
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DocumentType>('jine'); // <-- NOVÝ STAV s výchozí hodnotou
  const [adminOnly, setAdminOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Stavy pro zpětnou vazbu
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const BUCKET_NAME = 'documents'; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files ? e.target.files[0] : null);
    setSuccess(null);
    setError(null);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Kontrolujeme, zda je vyplněn titul a vybrán soubor (type má default)
    if (!user || !file || !title) {
      setError('Vyplňte název a vyberte soubor.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // 1. Nahrání souboru do Supabase Storage
    const fileExtension = file.name.split('.').pop();
    // Vytvoříme cestu: documents/typ/uuid.pdf
    const filePath = `${type}-${file.name}`; 

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      setError(`Chyba při nahrávání souboru: ${uploadError.message}`);
      setLoading(false);
      return;
    }
    
    // 2. Uložení metadat do databáze (tabulka: documents)
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        title,
        description,
        type, // <-- UKLÁDÁNÍ NOVÉHO DATUM
        file_path: filePath,
        admin_only: adminOnly,
      });

    if (dbError) {
        // Soubor byl nahrán, ale metadata se nepodařilo uložit.
        // V profesionálním prostředí by zde mělo následovat smazání souboru ze Storage.
        setError(`Soubor byl nahrán, ale metadata se nepodařilo uložit: ${dbError.message}.`);
    } else {
        setSuccess(`Dokument "${title}" (Typ: ${type.toUpperCase()}) byl úspěšně nahrán a publikován.`);
        // Vyčištění formuláře
        setTitle('');
        setDescription('');
        setType('jine');
        setAdminOnly(false);
        setFile(null);
    }

    setLoading(false);
  };
  /* Zobrazení formuláře s Tabulkami a stylem TailwindCSS */
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Nahrát nový Dokument</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && <div className="bg-green-100 text-green-700 p-3 rounded font-medium">{success}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded font-medium">{error}</div>}
        
        {/* Název Dokumentu */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Název Dokumentu (Povinné)</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Popis */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Popis</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
            rows={2}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Typ Dokumentu (NOVÉ POLE) */}
            <div>
                <label htmlFor="docType" className="block text-sm font-medium text-gray-700">Typ Dokumentu</label>
                <select
                    id="docType"
                    value={type}
                    onChange={(e) => setType(e.target.value as DocumentType)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                >
                    <option value="smernice">Směrnice</option>
                    <option value="manualy">Manuály (Zařízení, Vozidla)</option>
                    <option value="jine">Jiné dokumenty</option>
                </select>
            </div>
            
            {/* Omezení přístupu (Původní pole) */}
            <div className="flex items-end pb-2">
                <input
                type="checkbox"
                id="adminOnly"
                checked={adminOnly}
                onChange={(e) => setAdminOnly(e.target.checked)}
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="adminOnly" className="ml-2 block text-sm font-medium text-gray-700">
                Pouze pro Adminy (Řidiči dokument neuvidí)
                </label>
            </div>
        </div>


        {/* Výběr Souboru */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">Vyberte soubor (PDF, DOCX, JPG)</label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file || !title}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md shadow-lg hover:bg-green-700 disabled:opacity-50 font-bold"
        >
          {loading ? 'Nahrávám dokument a ukládám...' : 'Nahrát Dokument'}
        </button>
      </form>
    </div>
  );
};

export default DocumentUploadForm;