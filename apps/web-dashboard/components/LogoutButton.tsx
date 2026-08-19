'use client';

import { useRouter } from 'next/navigation';
import { logoutUser } from '../lib/api';

export function LogoutButton({ label = 'Se déconnecter' }: { label?: string }) {
  const router = useRouter();
  async function logout() {
    await logoutUser();
      window.localStorage.removeItem('a11y-user');
      window.dispatchEvent(new Event('a11y-auth-change'));
    router.push('/login');
    router.refresh();
  }
    return <button type="button" onClick={logout} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--color-surface-2)] focus-ring">{label}</button>;
}