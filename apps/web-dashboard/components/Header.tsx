'use client';

import { LogoutButton } from './LogoutButton';
import { LanguageSwitcher, useLanguage } from './LanguageSwitcher';
import { useEffect, useState } from 'react';
import { fetchCurrentUser } from '../lib/api';

export function Header() {
  const english = useLanguage() === 'en';
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const readStoredUser = () => {
      try {
        const user = JSON.parse(window.localStorage.getItem('a11y-user') ?? '{}');
        setUserName(user.name || user.email?.split('@')[0] || '');
      } catch { setUserName(''); }
    };
    const restoreSession = async () => {
      try {
        const user = await fetchCurrentUser();
        if (user) {
          window.localStorage.setItem('a11y-user', JSON.stringify({ name: user.name, email: user.email }));
          setUserName(user.name || user.email.split('@')[0] || '');
        } else {
          window.localStorage.removeItem('a11y-user');
          setUserName('');
        }
      } catch {
        readStoredUser();
      }
    };
    const handleAuthChange = () => { void restoreSession(); };
    void restoreSession();
    window.addEventListener('a11y-auth-change', handleAuthChange);
    return () => window.removeEventListener('a11y-auth-change', handleAuthChange);
  }, []);

  return (
    <header className="flex min-h-[72px] items-center justify-between border-b border-[var(--color-border)] bg-white px-5 sm:px-8">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{english ? 'Workspace / production' : 'Espace / production'}</p><p className="font-display font-semibold">{english ? 'Hello' : 'Bonjour'}{userName ? `, ${userName}` : english ? ', quality team' : ', équipe qualité'}</p></div>
      <div className="flex items-center gap-3"><LanguageSwitcher /><LogoutButton label={english ? 'Log out' : 'Se déconnecter'} /><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7f0e6] font-semibold text-[#126342]" aria-label={english ? 'Team profile' : 'Profil de l’équipe'}>EQ</span></div>
    </header>
  );
}
