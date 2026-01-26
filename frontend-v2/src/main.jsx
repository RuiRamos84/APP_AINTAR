/**
 * Main Entry Point
 * Ponto de entrada da aplicação
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/core/providers/AppProviders';
import App from './App.jsx';
import ErrorBoundary from '@/shared/components/common/ErrorBoundary';
import '@/styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>
);
