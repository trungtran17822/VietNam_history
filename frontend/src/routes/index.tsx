import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { currentUser, login, type Role } from '../lib/auth';
import { hubOf } from '../lib/guards';
import { playTransition } from '../lib/transition';
import { Icon } from '../components/ui';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => (typeof search.redirect === 'string' ? { redirect: search.redirect } : {}),
  beforeLoad: ({ search }) => {
    const user = currentUser();
    if (user) throw redirect({ to: search.redirect ?? hubOf(user.role) });
  },
  component: Login
});

const ROLES: { role: Role; label: string; copy: string }[] = [
  { role: 'teacher', label: 'Giáo viên', copy: 'Soạn bài, chiếu sa bàn lên lớp và mở phiên để cả lớp cùng trả lời.' },
  { role: 'student', label: 'Học sinh', copy: 'Xem lại bài đã học và thử cách đánh của riêng em.' }
];

function Login() {
  const { redirect: requested } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [role, setRole] = useState<Role>('teacher');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = login(role, username, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    playTransition(role === 'teacher' ? 'Quản lý bài giảng' : 'Bài đã học');
    // A lesson link opened before login is kept; only same-app paths are followed.
    if (requested?.startsWith('/lesson/')) router.history.push(requested);
    else navigate({ to: hubOf(role) });
  };

  return (
    <main id="view-login" className="app-view active mx-auto grid min-h-[calc(100dvh-8rem)] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_1fr]">
      <section>
        <img src="./assets/logo/logo-transparent.png" alt="" width={72} height={72} className="h-[4.5rem] w-[4.5rem]" />
        <h1 className="mt-4 t-3xl font-bold">Sử Việt</h1>
        <p className="mt-3 max-w-xl t-lg">Học lịch sử trên sa bàn lụa: xem lại một trận đánh, rồi thử cách làm của chính em và so sánh với cách của cha ông.</p>
        <ul className="mt-6 flex max-w-xl flex-col gap-3 t-sm">
          {['Sa bàn 3D theo từng giai đoạn, kèm nguồn tư liệu', 'Cả lớp gửi lựa chọn ẩn danh, không cần tài khoản', 'Kết quả tính minh bạch từ giả định của bài, luôn ghi rõ là mô phỏng'].map((t) => (
            <li key={t} className="flex gap-2.5">
              <Icon name="check" className="icon mt-0.5 text-ok" /> {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="card p-5 sm:p-7" aria-labelledby="login-title">
        <h2 id="login-title" className="t-xl font-semibold">Đăng nhập</h2>
        <div className="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Vai trò">
          {ROLES.map((r) => (
            <button
              key={r.role}
              id={`tab-login-${r.role}`}
              type="button"
              role="tab"
              aria-selected={role === r.role}
              className={`rounded-lg border p-3 text-left transition-colors ${role === r.role ? 'border-action bg-action-tint' : 'border-rule bg-card hover:border-[var(--sepia)]'}`}
              onClick={() => {
                setRole(r.role);
                setError('');
              }}
            >
              <span className="block font-semibold">{r.label}</span>
              <span className="mt-0.5 block t-xs muted">{r.copy}</span>
            </button>
          ))}
        </div>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <label className="block">
            <span className="label">Tên đăng nhập</span>
            <input className="field" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Mật khẩu</span>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="t-sm text-action" role="alert">{error}</p>}
          <button type="submit" id="btn-submit-login" className="btn btn-primary w-full">
            Đăng nhập với vai trò {role === 'teacher' ? 'giáo viên' : 'học sinh'} <Icon name="next" />
          </button>
          <p className="t-xs muted">Tài khoản thử nghiệm: admin / 123 cho cả hai vai trò.</p>
        </form>
      </section>
    </main>
  );
}
