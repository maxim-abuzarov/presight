import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { StrictMode, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Renders like main.tsx does — inside StrictMode — with a fresh, retry-free query client and a
 * router at `url`. StrictMode matters: it double-mounts effects, which is what used to abort the
 * first API requests on every page load in development.
 */
export function renderWithProviders(ui: ReactElement, url = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}
