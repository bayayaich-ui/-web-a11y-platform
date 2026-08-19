'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '../../lib/api';
import { LanguageSwitcher, useLanguage } from '../../components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const english = useLanguage() === 'en';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (mode === 'register' && name.trim().length < 1) { setError(english ? 'Enter your name.' : 'Saisissez votre nom.'); return; }
    if (!email || !email.includes('@')) { setError(english ? 'Enter a valid email address.' : 'Saisissez une adresse e-mail valide.'); return; }
    if (password.length < 8) { setError(english ? 'Your password must contain at least 8 characters.' : 'Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    try {
      const user = mode === 'register'
        ? await registerUser(email, name.trim(), password)
        : await loginUser(email, password);
      window.localStorage.setItem('a11y-user', JSON.stringify({ name: user.name, email: user.email }));
      window.dispatchEvent(new Event('a11y-auth-change'));
      router.push('/sites');
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (english ? 'Connection failed.' : 'Connexion impossible pour le moment.'));
    } finally { setLoading(false); }
    void remember;
  }

  const copy = english ? {
    secure: 'Secure workspace', welcome: 'Welcome back', create: 'Create your workspace', loginIntro: 'Sign in to continue your accessibility monitoring.', registerIntro: 'Start monitoring the accessibility of your websites.', fullName: 'Full name', email: 'Email address', password: 'Password', remember: 'Remember me', signIn: 'Sign in', signUp: 'Create my account', processing: 'Processing…', minimum: '8 characters minimum', hide: 'Hide password', show: 'Show password', clarity: 'Clarity. Compliance. Confidence.', hero: 'Make every digital experience more inclusive.', heroText: 'A WCAG monitoring platform designed to turn audits into concrete action.', continuous: 'Continuous auditing', regressions: 'Catch regressions early.', wcag: 'WCAG 2.2', rules: 'Clear, actionable rules.', aligned: 'Aligned teams', traceable: 'Track every fix.', stored: 'Passwords are stored using a secure hash.'
  } : {
    secure: 'Espace sécurisé', welcome: 'Bienvenue à nouveau', create: 'Créer votre espace', loginIntro: 'Connectez-vous pour retrouver votre suivi d’accessibilité.', registerIntro: 'Commencez à suivre la conformité de vos sites.', fullName: 'Nom complet', email: 'Adresse e-mail', password: 'Mot de passe', remember: 'Se souvenir de moi', signIn: 'Se connecter', signUp: 'Créer mon compte', processing: 'Traitement…', minimum: '8 caractères minimum', hide: 'Masquer le mot de passe', show: 'Afficher le mot de passe', clarity: 'Clarté. Conformité. Confiance.', hero: 'Rendez chaque expérience numérique plus inclusive.', heroText: 'Une plateforme de monitoring WCAG pensée pour transformer les audits en actions concrètes.', continuous: 'Audit continu', regressions: 'Détectez tôt les régressions.', wcag: 'WCAG 2.2', rules: 'Des règles toujours lisibles.', aligned: 'Équipe alignée', traceable: 'Des corrections traçables.', stored: 'Vos mots de passe sont stockés sous forme de hash sécurisé.'
  };

  return <main className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]"><div className="absolute right-5 top-5 z-50 sm:right-8 sm:top-8"><LanguageSwitcher /></div>
    <section className="login-aurora relative hidden overflow-hidden bg-[#102d4f] px-12 py-12 text-white lg:flex lg:flex-col xl:px-20" aria-labelledby="login-brand">
      <div className="login-logo-stage relative z-10 flex w-fit items-center rounded-[2rem] p-5"><Image src="/login-logo.png" alt="A11y AccessIQ, plateforme d'accessibilité web propulsée par l'IA" width={480} height={480} className="h-auto w-[min(28vw,390px)]" priority /></div>
      <div className="relative z-10 mt-auto max-w-xl pb-10"><p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#8bd5b4]">{copy.clarity}</p><h1 id="login-brand" className="font-display text-5xl font-bold leading-[1.08]">{copy.hero}</h1><p className="mt-6 max-w-md text-lg leading-8 text-[#d8e6f2]">{copy.heroText}</p><div className="mt-9 grid gap-4 text-sm text-[#d8e6f2] sm:grid-cols-3"><span><strong className="block text-white">{copy.continuous}</strong>{copy.regressions}</span><span><strong className="block text-white">{copy.wcag}</strong>{copy.rules}</span><span><strong className="block text-white">{copy.aligned}</strong>{copy.traceable}</span></div></div>
    </section>
    <section className="flex items-center justify-center bg-[#e9f2f7] px-5 py-12 sm:px-10"><div className="w-full max-w-md"><div className="mb-8 flex justify-center lg:hidden"><Image src="/login-logo.png" alt="A11y AccessIQ" width={320} height={320} className="h-auto w-64 rounded-2xl bg-[#dff4fb] p-3 shadow-[0_16px_35px_rgba(16,45,79,0.16)]" priority /></div><div className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">{copy.secure}</p><h2 className="mt-2 font-display text-3xl font-bold text-[#102d4f]">{mode === 'login' ? copy.welcome : copy.create}</h2><p className="mt-2 text-[var(--color-muted)]">{mode === 'login' ? copy.loginIntro : copy.registerIntro}</p></div><div className="mb-5 grid grid-cols-2 rounded-lg bg-[#e8eff7] p-1"><button type="button" onClick={() => { setMode('login'); setError(''); }} className={`min-h-11 rounded-md text-sm font-semibold focus-ring ${mode === 'login' ? 'bg-white text-[#102d4f] shadow-sm' : 'text-[var(--color-muted)]'}`}>{copy.signIn}</button><button type="button" onClick={() => { setMode('register'); setError(''); }} className={`min-h-11 rounded-md text-sm font-semibold focus-ring ${mode === 'register' ? 'bg-white text-[#102d4f] shadow-sm' : 'text-[var(--color-muted)]'}`}>{english ? 'Sign up' : 'S’inscrire'}</button></div><form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_18px_45px_rgba(16,45,79,0.08)] sm:p-8" noValidate><div className="flex flex-col gap-5">{mode === 'register' && <div><label htmlFor="name" className="mb-2 block text-sm font-semibold">{copy.fullName}</label><input id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-12 w-full rounded-lg border border-[var(--color-border)] px-3 focus-ring" required /></div>}<div><label htmlFor="email" className="mb-2 block text-sm font-semibold">{copy.email}</label><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12 w-full rounded-lg border border-[var(--color-border)] px-3 focus-ring" placeholder="you@company.com" required /></div><div><label htmlFor="password" className="mb-2 block text-sm font-semibold">{copy.password}</label><div className="relative"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-12 w-full rounded-lg border border-[var(--color-border)] px-3 pr-20 focus-ring" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 min-h-10 -translate-y-1/2 rounded px-2 text-sm font-semibold text-[var(--color-primary)] focus-ring" aria-label={showPassword ? copy.hide : copy.show}>{showPassword ? (english ? 'Hide' : 'Masquer') : (english ? 'Show' : 'Afficher')}</button></div><p className="mt-1 text-xs text-[var(--color-muted)]">{copy.minimum}</p></div>{mode === 'login' && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#1457a6]" />{copy.remember}</label>}{error && <p role="alert" aria-live="assertive" className="rounded-lg bg-[#fce8e6] px-3 py-2 text-sm font-medium text-[#8f1d14]">{error}</p>}<button type="submit" disabled={loading} className="min-h-12 w-full rounded-lg bg-[#1457a6] px-4 font-semibold text-white shadow-sm transition hover:bg-[#102d4f] disabled:cursor-wait disabled:opacity-70 focus-ring">{loading ? copy.processing : mode === 'login' ? copy.signIn : copy.signUp}</button></div></form><p className="mt-6 text-center text-xs leading-5 text-[var(--color-muted)]">{copy.stored}</p></div></section>
  </main>;
}
