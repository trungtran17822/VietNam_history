import { Link, Outlet, createRootRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { currentUser, logout } from '../lib/auth';
import { isAudioOn, toggleAudio } from '../lib/audio';
import { setQuality, togglePresentation, useQuality } from '../lib/prefs';
import { endTransition, useTransitionState } from '../lib/transition';
import { Icon, PROTOTYPE_NOTICE } from '../components/ui';

export const Route = createRootRoute({ component: RootLayout, notFoundComponent: NotFound });

const LOGO = './assets/logo/logo-transparent.png';

function RootLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const showHeader = path !== '/' && path !== '/fonttest' && Boolean(currentUser());
  return (
    <>
      <div className="global-notice-strip" role="note">{PROTOTYPE_NOTICE}</div>
      {showHeader && <Header />}
      <Outlet />
      <footer className="app-footer">
        <p>{PROTOTYPE_NOTICE}. Số liệu mô phỏng là giá trị minh họa từ các giả định của bài học, không phải sự thật lịch sử.</p>
        <p className="mt-1">Sử Việt · bản thử nghiệm dành cho lớp học</p>
      </footer>
      <CinematicTransition />
    </>
  );
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function Header() {
  const user = currentUser()!;
  const navigate = useNavigate();
  const quality = useQuality();
  const [menu, setMenu] = useState<'tools' | 'user' | null>(null);
  const [audio, setAudio] = useState(isAudioOn());
  const close = () => setMenu(null);
  const toolsRef = useDismiss(menu === 'tools', close);
  const userRef = useDismiss(menu === 'user', close);
  const hub = user.role === 'teacher' ? '/teacher' : '/student';
  const nav = [
    { to: hub, label: user.role === 'teacher' ? 'Quản lý bài giảng' : 'Bài đã học' },
    { to: '/atlas', label: 'Atlas Việt Nam' }
  ] as const;

  return (
    <header id="main-header" className="app-header">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4">
        <Link to={hub} className="flex items-center gap-2.5 no-underline" aria-label="Sử Việt, về trang chính">
          <img src={LOGO} alt="" width={36} height={36} className="h-9 w-9" />
          <span className="font-serif t-lg font-bold">Sử Việt</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link" activeOptions={{ exact: false }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <div ref={toolsRef} className="relative">
            <button type="button" className="header-tool" aria-expanded={menu === 'tools'} aria-haspopup="true" onClick={() => setMenu(menu === 'tools' ? null : 'tools')}>
              <Icon name="sliders" /> <span className="hidden sm:inline">Tuỳ chọn</span>
            </button>
            {menu === 'tools' && (
              <div className="menu-popover" role="menu">
                <div className="md:hidden">
                  {nav.map((item) => (
                    <Link key={item.to} to={item.to} className="menu-item no-underline" role="menuitem" onClick={close}>
                      {item.label}
                    </Link>
                  ))}
                  <div className="rule-top my-1" />
                </div>
                <button type="button" id="btn-toggle-audio" className="menu-item" role="menuitemcheckbox" aria-checked={audio} onClick={() => setAudio(toggleAudio())}>
                  <span className="flex items-center gap-2"><Icon name={audio ? 'sound' : 'mute'} /> Âm thanh sa bàn</span>
                  <span className="t-sm muted">{audio ? 'Bật' : 'Tắt'}</span>
                </button>
                <button type="button" id="btn-toggle-quality" className="menu-item" role="menuitem" onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}>
                  <span className="flex items-center gap-2"><Icon name="gauge" /> Đồ hoạ</span>
                  <span className="t-sm muted">{quality === 'high' ? 'Cao' : 'Thấp (máy yếu)'}</span>
                </button>
                <button type="button" id="btn-toggle-presentation" className="menu-item" role="menuitem" onClick={() => (togglePresentation(), close())}>
                  <span className="flex items-center gap-2"><Icon name="screen" /> Chiếu lên lớp</span>
                  <span className="t-sm muted">Esc để thoát</span>
                </button>
              </div>
            )}
          </div>
          <div ref={userRef} className="relative">
            <button type="button" className="header-tool" aria-expanded={menu === 'user'} aria-haspopup="true" onClick={() => setMenu(menu === 'user' ? null : 'user')}>
              <Icon name="user" /> <span className="hidden max-w-[12rem] truncate lg:inline">{user.displayName}</span>
            </button>
            {menu === 'user' && (
              <div className="menu-popover" role="menu">
                <div className="px-3 py-2">
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="t-sm muted">{user.roleLabel}</p>
                </div>
                <button
                  type="button"
                  id="btn-logout"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    logout();
                    navigate({ to: '/', search: {} });
                  }}
                >
                  <span className="flex items-center gap-2"><Icon name="logout" /> Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function CinematicTransition() {
  const { active, title } = useTransitionState();
  return (
    <div id="cinematic-transition" className={`cinematic-transition${active ? ' active' : ''}`} aria-hidden={!active} role="presentation">
      {active && (
        <>
          <img src={LOGO} alt="Sử Việt" />
          <h2 className="t-3xl font-semibold">{title}</h2>
          <span className="transition-rule" />
          <button type="button" id="btn-skip-transition" className="btn btn-quiet mt-4 !text-page underline" onClick={endTransition}>
            Bỏ qua · Đi đến bài học
          </button>
        </>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="t-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 muted">Đường dẫn này không còn hoặc chưa đúng.</p>
      <Link to="/" className="btn btn-primary mt-6">Về trang đăng nhập</Link>
    </main>
  );
}
