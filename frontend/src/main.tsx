import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initStorage } from './lib/storage';
import { routeTree } from './routeTree.gen';
import './styles.css';

const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: 'intent', scrollRestoration: true });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Only the class session talks to a server; lesson data is local.
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 0 } } });

async function start() {
  // v1 links were '#lesson/<id>'.
  if (/^#lesson\//.test(location.hash)) location.replace(`#/${location.hash.slice(1)}`);
  await initStorage();
  createRoot(document.getElementById('app')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}
start();
