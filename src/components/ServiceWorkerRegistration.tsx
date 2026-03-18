// src/components/ServiceWorkerRegistration.tsx
'use client';

import { useEffect } from 'react';

const ServiceWorkerRegistration: React.FC = () => {
  useEffect(() => {
    // Registrace pouze na klientovi a jen v produkčním prostředí
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service Worker zaregistrován s rozsahem:', registration.scope);
            
            // Logika pro aktualizace (volitelné)
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Nová verze obsahu je k dispozici. Informujte uživatele o nutnosti refresh.');
                        }
                    };
                }
            };
            
          })
          .catch((error) => {
            console.error('Service Worker registrace selhala:', error);
          });
      });
    }
  }, []);

  return null; // Tato komponenta nic nevykresluje
};

export default ServiceWorkerRegistration;