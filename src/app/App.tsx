import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import { AppToastProvider } from '../features/shared';
import { LanguageProvider } from '../i18n';
import { createQueryClient } from './queryClient';
import { AppRoutes } from './routes';

export interface AppProps {
  /** Inject a client in tests; defaults to a fresh one. */
  queryClient?: QueryClient;
}

export function App({ queryClient }: AppProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <AppToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
