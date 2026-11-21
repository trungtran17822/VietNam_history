import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useRef, useState, type FormEvent } from 'react';
import { currentUser, login, type Role } from '../lib/auth';
import { hubOf } from '../lib/guards';
import { playTransition } from '../lib/transition';
import { Icon, type IconName } from '../components/ui';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => (typeof search.redirect === 'string' ? { redirect: search.redirect } : {}),
  beforeLoad: ({ search }) => {
    const user = currentUser();
    if (user) throw redirect({ to: search.redirect ?? hubOf(user.role) });
  },
  component: Login
});

const ROLES: { role: Role; label: string; copy: string; icon: IconName }[] = [
  { role: 'teacher', label: 'Giáo viên', icon: 'screen', copy: 'Soạn bài, điều khiển sa bàn và mở phiên cho lớp.' },
  { role: 'student', label: 'Học sinh', icon: 'book', copy: 'Xem bài đã phát hành và thử phương án của em.' }
];

function Login() {
  const { redirect: requested } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [role, setRole] = useState<Role>('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const submitButton = useRef<HTMLButtonElement>(null);
  const activeRole = ROLES.find(item => item.role === role)!;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = login(role, username, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    playTransition(role === 'teacher' ? 'Quản lý bài giảng' : 'Bài đã học');
    if (requested && /^(?:\/lesson\/|\/atlas(?:\?|$))/.test(requested)) router.history.push(requested);
    else navigate({ to: hubOf(role) });
  };

  function loadSample() {
    setUsername('admin');
    setPassword('123');
    setError('');
    submitButton.current?.focus();
  }

  return (
    <main id="view-login" className="app-view classroom-login">
      <section className="classroom-cover" aria-labelledby="cover-title">
        <img className="classroom-cover-art" src="./assets/decor/classroom-cover.webp" alt="" width={1560} height={1040} fetchPriority="high" />
        <div className="classroom-cover-shade" />
        <div className="classroom-cover-inner">
          <a href="./" className="classroom-wordmark" aria-label="Sử Việt, về trang chủ">
            <img src="./assets/logo/logo-transparent.png" alt="" width={46} height={46} />
            <span>Sử Việt</span>
          </a>
          <div className="classroom-cover-copy">
            <h2 id="cover-title">Lịch sử,<br />{' '}trên sa bàn.</h2>
            <p>Theo dõi diễn biến, đọc tư liệu và thử một cách làm khác trong cùng bài học.</p>
            <span className="classroom-art-note">Mô hình sa bàn · Minh họa nghệ thuật</span>
          </div>
        </div>
      </section>
      <section className="classroom-login-side" aria-labelledby="login-title">
        <div className="classroom-login-content">
          <h1 id="login-title">Vào lớp học</h1>
          <p className="classroom-login-intro">Chọn vai trò để mở không gian học tập của bạn.</p>
          <form className="classroom-login-form" onSubmit={submit}>
            <fieldset className="classroom-roles">
              <legend>Vai trò</legend>
              <div className="classroom-role-grid">
                {ROLES.map(item => (
                  <label key={item.role} className="classroom-role" data-selected={role === item.role}>
                    <input type="radio" name="role" id={`tab-login-${item.role}`} value={item.role}
                      checked={role === item.role} onChange={() => { setRole(item.role); setError(''); }}
                      aria-labelledby={`role-label-${item.role}`} aria-describedby={`role-desc-${item.role}`} />
                    <Icon name={item.icon} className="role-icon icon" />
                    <strong id={`role-label-${item.role}`}>{item.label}</strong>
                    <span className="role-desc" id={`role-desc-${item.role}`}>{item.copy}</span>
                    <span className="role-dot" aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="classroom-field">
              <span>Tên đăng nhập</span>
              <input className="field" autoComplete="username" value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }} required />
            </label>
            <div className="classroom-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="password-wrap">
                <input className="field" id="login-password" type={visible ? 'text' : 'password'} autoComplete="current-password"
                  value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} required />
                <button type="button" className="password-toggle" onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-controls="login-password">
                  {visible ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>
            {error && <p className="classroom-login-error" role="alert">{error}</p>}
            <button ref={submitButton} type="submit" id="btn-submit-login" className="btn btn-primary classroom-login-submit">
              Đăng nhập với vai trò {activeRole.label.toLowerCase()} <Icon name="next" />
            </button>
            <div className="sample-account">
              <span>Tài khoản thử nghiệm <code>admin / 123</code></span>
              <button type="button" onClick={loadSample}>Điền tài khoản mẫu</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
