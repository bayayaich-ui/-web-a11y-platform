'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthRequestError, loginUser, registerUser } from '../lib/api';
import { LanguageSwitcher, useLanguage } from './LanguageSwitcher';

type Mode = 'login' | 'register';
type FieldErrors = { name?: string; email?: string; password?: string };

export default function LoginExperience() {
  const router = useRouter();
  const english = useLanguage() === 'en';
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);

  const copy = english ? {
    eyebrow: 'Secure workspace', title: 'Welcome back', registerTitle: 'Create your workspace', loginIntro: 'Sign in to continue your accessibility monitoring.', registerIntro: 'Start monitoring the accessibility of your websites.', name: 'Full name', email: 'Email address', password: 'Password', emailPlaceholder: 'you@company.com', remember: 'Remember me', signIn: 'Sign in', signUp: 'Create my account', processing: 'Signing you in…', creating: 'Creating your workspace…', minimum: '8 characters minimum', show: 'Show password', hide: 'Hide password', invalidEmail: 'Enter a valid email address.', requiredEmail: 'Email address is required.', requiredPassword: 'Password is required.', requiredName: 'Enter your name.', shortPassword: 'Your password must contain at least 8 characters.', clarity: 'Clarity. Compliance. Confidence.', hero: 'Make every digital experience more inclusive.', heroText: 'A WCAG monitoring platform designed to turn audit findings into clear, trackable action.', statOne: 'Continuous auditing', statOneText: 'Catch regressions early.', statTwo: 'WCAG 2.2', statTwoText: 'Rules your team can act on.', statThree: 'Traceable fixes', statThreeText: 'Keep every decision visible.', security: 'Your password is protected with a secure hash.'
  } : {
    eyebrow: 'Espace sécurisé', title: 'Bienvenue à nouveau', registerTitle: 'Créer votre espace', loginIntro: 'Connectez-vous pour retrouver votre suivi d’accessibilité.', registerIntro: 'Commencez à suivre la conformité de vos sites.', name: 'Nom complet', email: 'Adresse e-mail', password: 'Mot de passe', emailPlaceholder: 'vous@entreprise.com', remember: 'Se souvenir de moi', signIn: 'Se connecter', signUp: 'Créer mon compte', processing: 'Connexion en cours…', creating: 'Création de votre espace…', minimum: '8 caractères minimum', show: 'Afficher le mot de passe', hide: 'Masquer le mot de passe', invalidEmail: 'Saisissez une adresse e-mail valide.', requiredEmail: 'L’adresse e-mail est requise.', requiredPassword: 'Le mot de passe est requis.', requiredName: 'Saisissez votre nom.', shortPassword: 'Le mot de passe doit contenir au moins 8 caractères.', clarity: 'Clarté. Conformité. Confiance.', hero: 'Rendez chaque expérience numérique plus inclusive.', heroText: 'Une plateforme WCAG qui transforme chaque audit en actions claires et traçables.', statOne: 'Audit continu', statOneText: 'Détectez tôt les régressions.', statTwo: 'WCAG 2.2', statTwoText: 'Des règles directement actionnables.', statThree: 'Corrections traçables', statThreeText: 'Gardez chaque décision visible.', security: 'Votre mot de passe est protégé par un hash sécurisé.'
  };

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setFieldErrors({});
    setRequestError('');
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (mode === 'register' && !name.trim()) errors.name = copy.requiredName;
    if (!email.trim()) errors.email = copy.requiredEmail;
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = copy.invalidEmail;
    if (!password) errors.password = copy.requiredPassword;
    else if (password.length < 8) errors.password = copy.shortPassword;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError('');
    if (!validate() || loading) return;
    setLoading(true);
    try {
      const user = mode === 'register' ? await registerUser(email.trim(), name.trim(), password) : await loginUser(email.trim(), password);
      window.localStorage.setItem('a11y-user', JSON.stringify({ name: user.name, email: user.email }));
      window.dispatchEvent(new Event('a11y-auth-change'));
      router.push('/sites');
      router.refresh();
    } catch (error) {
      if (error instanceof AuthRequestError && error.status === 401) setRequestError(english ? 'Incorrect email or password.' : 'Adresse e-mail ou mot de passe incorrect.');
      else if (error instanceof AuthRequestError && error.status === 409) setRequestError(english ? 'This email address is already registered.' : 'Cette adresse e-mail est déjà utilisée.');
      else if (error instanceof AuthRequestError && error.status === 0) setRequestError(english ? 'The backend is unreachable. Check that it is running on port 8002.' : error.message);
      else setRequestError(english ? 'Connection failed. Please try again.' : 'Connexion impossible pour le moment. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (field: keyof FieldErrors) => `mt-2 min-h-12 w-full rounded-lg border bg-[#fbfdff] px-3 text-[#102d4f] shadow-[0_1px_2px_rgba(16,45,79,0.04)] transition duration-200 placeholder:text-[#7890a6] hover:border-[#9bb6cf] focus:border-[#1457a6] focus:bg-white focus:ring-4 focus:ring-[#1457a6]/10 ${fieldErrors[field] ? 'border-[#b42318] bg-[#fff9f8] focus:border-[#b42318] focus:ring-[#b42318]/10' : 'border-[#d5e0eb]'}`;

  return (
    <main className="login-experience min-h-screen bg-[#eef4f8] text-[#132238]">
      <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-8"><LanguageSwitcher /></div>
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
        <section className="login-aurora relative hidden overflow-hidden px-8 py-10 text-white lg:flex lg:flex-col xl:px-16" aria-labelledby="login-brand-title">
          <div className="relative z-10 flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 p-1 ring-1 ring-white/20"><Image src="/dashboard-logo.png" alt="" width={48} height={48} priority /></div><div><p className="font-display text-lg font-bold tracking-tight">AccessIQ</p><p className="text-xs font-medium uppercase tracking-[0.14em] text-[#b7d7e6]">Accessibility OS</p></div></div>
          <div className="relative z-10 mt-16 max-w-xl xl:mt-auto xl:pb-14"><p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8bd5b4]">{copy.clarity}</p><h1 id="login-brand-title" className="font-display text-4xl font-bold leading-[1.08] xl:text-6xl">{copy.hero}</h1><p className="mt-6 max-w-lg text-base leading-7 text-[#d8e6f2]">{copy.heroText}</p><div className="mt-10 grid gap-3 sm:grid-cols-3">{[[copy.statOne, copy.statOneText], [copy.statTwo, copy.statTwoText], [copy.statThree, copy.statThreeText]].map(([title, text]) => <div key={title} className="border-l border-[#70cbb2]/60 pl-3"><strong className="block text-sm text-white">{title}</strong><span className="mt-1 block text-xs leading-5 text-[#b7d7e6]">{text}</span></div>)}</div></div>
        </section>
        <section className="flex items-center justify-center px-5 py-20 sm:px-10 lg:px-14 lg:py-12"><div className="w-full max-w-md animate-[login-rise_500ms_ease-out_both]"><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dff4fb] p-1"><Image src="/dashboard-logo.png" alt="" width={44} height={44} priority /></div><div><p className="font-display font-bold text-[#102d4f]">AccessIQ</p><p className="text-xs uppercase tracking-[0.14em] text-[#5f7891]">Accessibility OS</p></div></div><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1457a6]">{copy.eyebrow}</p><h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#102d4f]">{mode === 'login' ? copy.title : copy.registerTitle}</h2><p className="mt-3 leading-6 text-[#4b5d73]">{mode === 'login' ? copy.loginIntro : copy.registerIntro}</p></div><div className="mb-5 grid grid-cols-2 rounded-xl bg-[#dfeaf3] p-1" role="tablist" aria-label={english ? 'Account access' : 'Accès au compte'}><button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')} className={`min-h-11 rounded-lg text-sm font-bold transition focus-ring ${mode === 'login' ? 'bg-white text-[#102d4f] shadow-sm' : 'text-[#58718a] hover:text-[#102d4f]'}`}>{copy.signIn}</button><button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchMode('register')} className={`min-h-11 rounded-lg text-sm font-bold transition focus-ring ${mode === 'register' ? 'bg-white text-[#102d4f] shadow-sm' : 'text-[#58718a] hover:text-[#102d4f]'}`}>{copy.signUp}</button></div><form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-[#d5e0eb] bg-white p-6 shadow-[0_20px_55px_rgba(16,45,79,0.10)] sm:p-8"><div className="flex flex-col gap-5">{mode === 'register' && <div><label htmlFor="login-name" className="text-sm font-bold text-[#223852]">{copy.name}</label><input id="login-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'login-name-error' : undefined} className={inputClass('name')} />{fieldErrors.name && <p id="login-name-error" role="alert" className="mt-2 text-sm font-medium text-[#b42318]">{fieldErrors.name}</p>}</div>}<div><label htmlFor="login-email" className="text-sm font-bold text-[#223852]">{copy.email}</label><input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'login-email-error' : undefined} placeholder={copy.emailPlaceholder} className={inputClass('email')} />{fieldErrors.email && <p id="login-email-error" role="alert" className="mt-2 text-sm font-medium text-[#b42318]">{fieldErrors.email}</p>}</div><div><div className="flex items-center justify-between gap-4"><label htmlFor="login-password" className="text-sm font-bold text-[#223852]">{copy.password}</label><span className="text-xs text-[#6a8096]">{copy.minimum}</span></div><div className="relative"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'login-password-error' : 'login-password-help'} className={`${inputClass('password')} pr-24`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 min-h-10 -translate-y-1/2 rounded-md px-2 text-sm font-bold text-[#1457a6] hover:bg-[#edf4fa] focus-ring" aria-label={showPassword ? copy.hide : copy.show}>{showPassword ? (english ? 'Hide' : 'Masquer') : (english ? 'Show' : 'Afficher')}</button></div><p id="login-password-help" className="sr-only">{copy.minimum}</p>{fieldErrors.password && <p id="login-password-error" role="alert" className="mt-2 text-sm font-medium text-[#b42318]">{fieldErrors.password}</p>}</div>{mode === 'login' && <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-[#4b5d73]"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-5 w-5 rounded accent-[#1457a6]" />{copy.remember}</label>}{requestError && <p role="alert" aria-live="assertive" className="rounded-lg border border-[#f1c7c2] bg-[#fff2f0] px-3 py-3 text-sm font-semibold text-[#8f1d14]">{requestError}</p>}<button type="submit" disabled={loading} aria-busy={loading} className="min-h-12 w-full rounded-lg bg-[#1457a6] px-4 font-bold text-white shadow-[0_8px_18px_rgba(20,87,166,0.22)] transition duration-200 hover:bg-[#102d4f] hover:shadow-[0_10px_22px_rgba(16,45,79,0.24)] disabled:cursor-wait disabled:opacity-70 focus-ring">{loading && <span aria-hidden="true" className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{loading ? (mode === 'login' ? copy.processing : copy.creating) : (mode === 'login' ? copy.signIn : copy.signUp)}</button></div></form><p className="mt-6 text-center text-xs leading-5 text-[#6a8096]">{copy.security}</p></div></section>
      </div>
    </main>
  );
}
