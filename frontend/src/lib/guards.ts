// Route guards: every page except login and #/fonttest needs the demo login; some need a role.
import { redirect } from '@tanstack/react-router';
import { currentUser, type Role } from './auth';

export const hubOf = (role: Role) => (role === 'teacher' ? '/teacher' : '/student');

export function requireUser(role?: Role) {
  return ({ location }: { location: { href: string } }) => {
    const user = currentUser();
    // Keep the requested lesson link through the login form.
    if (!user) throw redirect({ to: '/', search: { redirect: location.href } });
    if (role && user.role !== role) throw redirect({ to: hubOf(user.role) });
    return { user };
  };
}
