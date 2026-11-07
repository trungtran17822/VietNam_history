import { Link, createFileRoute } from '@tanstack/react-router';
import { requireUser } from '../lib/guards';
import { currentUser } from '../lib/auth';
import { Icon } from '../components/ui';

// Slot for the Vietnam 3D atlas (plan §5, a later session).
export const Route = createFileRoute('/atlas')({ beforeLoad: requireUser(), component: Atlas });

function Atlas() {
  const hub = currentUser()?.role === 'student' ? '/student' : '/teacher';
  return (
    <main id="view-atlas" className="app-view active mx-auto max-w-2xl px-4 py-16 text-center">
      <Icon name="map" className="mx-auto h-12 w-12 text-lacquer" />
      <h1 className="mt-4 t-3xl font-bold">Atlas Việt Nam</h1>
      <p className="mt-2 t-lg">Sắp ra mắt</p>
      <p className="mt-3 muted">Bản đồ 3D để tìm bài học theo địa danh và thời kỳ đang được xây dựng. Các bài học hiện có vẫn mở từ danh sách bài giảng.</p>
      <Link to={hub} className="btn btn-primary mt-6"><Icon name="back" /> Về danh sách bài</Link>
    </main>
  );
}
