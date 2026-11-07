import { createFileRoute } from '@tanstack/react-router';
import { requireUser } from '../lib/guards';
import { AtlasView } from '../features/atlas/AtlasView';
import { decodeAtlasState, encodeAtlasState, type AtlasSearch } from '../features/atlas/search';

// #/atlas?place=<id>&kind=<kind,kind>&q=<text>: shareable state; three.js loads with this route's chunk.
export const Route = createFileRoute('/atlas')({
  beforeLoad: requireUser(),
  validateSearch: (raw: Record<string, unknown>): AtlasSearch => encodeAtlasState(decodeAtlasState(raw)),
  component: AtlasRoute,
});

function AtlasRoute() {
  const navigate = Route.useNavigate();
  return <AtlasView search={Route.useSearch()} onSearch={(search, replace) => navigate({ search, replace })} />;
}
