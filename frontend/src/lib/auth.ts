// Demo login, client-side only (not security): admin / 123 for both roles, kept in sessionStorage.
export type Role = 'teacher' | 'student';
export type User = { role: Role; roleLabel: string; displayName: string; username: string; loginTime: string };

const KEY = 'history_sim_auth_session';
const ACCOUNTS: Record<Role, { username: string; password: string; roleLabel: string; displayName: string }> = {
  teacher: { username: 'admin', password: '123', roleLabel: 'Giáo viên', displayName: 'Thầy Nguyễn Văn Hưng' },
  student: { username: 'admin', password: '123', roleLabel: 'Học sinh', displayName: 'Nguyễn Quang Vinh (11A1)' }
};

export function login(role: Role, username: string, password: string): { ok: true; user: User } | { ok: false; message: string } {
  const account = ACCOUNTS[role];
  if (!account) return { ok: false, message: 'Vai trò đăng nhập không hợp lệ.' };
  if (username.trim() !== account.username || password.trim() !== account.password) {
    return { ok: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác. (Gợi ý: admin / 123)' };
  }
  const user: User = { role, roleLabel: account.roleLabel, displayName: account.displayName, username: account.username, loginTime: new Date().toISOString() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* Private mode: the login lasts for this page only. */
  }
  return { ok: true, user };
}

export function currentUser(): User | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function logout() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
