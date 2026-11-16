import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.tsx';
import { createQueryClient } from './api/queryClient.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
// Self-hosted (bundled by Vite) instead of Google Fonts: no third-party request, no layout
// shift from a late font, and the CSP can stay font-src 'self'.
import '@fontsource-variable/libre-franklin/index.css';
import './styles.css';

const queryClient = createQueryClient();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
