// Shim process for libraries that expect it - MUST BE AT THE TOP
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { 
    env: { 
      NODE_ENV: import.meta.env.MODE || 'production'
    } 
  };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import './index.css';

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason || 'No reason provided', event);
  
  // Check if it's a chunk load error
  const isChunkError = 
    event.reason?.name === 'ChunkLoadError' || 
    (event.reason?.message && (
      event.reason.message.includes('Failed to fetch dynamically imported module') ||
      event.reason.message.includes('Loading chunk') ||
      event.reason.message.includes('error loading dynamically imported module')
    ));

  if (isChunkError) {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    if (!pageHasAlreadyBeenForceRefreshed) {
      console.warn('Chunk load error detected. Force refreshing page...');
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
      window.location.reload();
    }
  }
});

// Environment variable diagnostic check
if (import.meta.env.PROD) {
  const requiredVars = ['VITE_FIREBASE_API_KEY'];
  const missingVars = requiredVars.filter(v => !import.meta.env[v]);
  if (missingVars.length > 0) {
    console.error('❌ CRITICAL: Missing environment variables:', missingVars.join(', '));
    console.error('The application may not function correctly. Please check your environment settings.');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster theme="dark" position="top-center" toastOptions={{
        style: {
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
        }
      }} />
    </ErrorBoundary>
  </StrictMode>,
);
