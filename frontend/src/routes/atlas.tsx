import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { requireUser } from '../lib/guards';
import { IllustrationAtlas } from '../features/atlas/IllustrationAtlas'; // the AI illustration; the 3D AtlasView is on hold
import { decodeAtlasState, encodeAtlasState, type AtlasSearch } from '../features/atlas/search';

// #/atlas?place=<id>&kind=<kind,kind>&q=<text>: shareable state. No three.js on this route while the 3D map is on hold.
export const Route = createFileRoute('/atlas')({
  beforeLoad: requireUser(),
  validateSearch: (raw: Record<string, unknown>): AtlasSearch => encodeAtlasState(decodeAtlasState(raw)),
  component: AtlasRoute,
});

function AtlasRoute() {
  const navigate = Route.useNavigate();
  const onSearch = useCallback((search: AtlasSearch, replace?: boolean) => {
    void navigate({ search, replace, resetScroll: false, viewTransition: false });
  }, [navigate]);
  return <IllustrationAtlas search={Route.useSearch()} onSearch={onSearch} />;
}
