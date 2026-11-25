import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-recover from deployment chunk mismatches (Vite built-in event)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Dynamic import preload error detected. Auto-reloading to fetch updated assets...', event);
    const reloadKey = 'crm_vite_preload_reloaded';
    if (!window.sessionStorage.getItem(reloadKey)) {
      window.sessionStorage.setItem(reloadKey, 'true');
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
