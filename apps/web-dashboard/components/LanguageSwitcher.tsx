'use client';

import { useEffect, useRef, useState } from 'react';

type Language = 'fr' | 'en';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    const saved = window.localStorage.getItem('a11y-language');
    if (saved === 'fr' || saved === 'en') setLanguage(saved);
    const update = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener('a11y-language-change', update);
    return () => window.removeEventListener('a11y-language-change', update);
  }, []);

  return language;
}

export function LanguageSwitcher() {
  const language = useLanguage();
  const [, setLanguage] = useState<Language>('fr');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('a11y-language');
    if (saved === 'fr' || saved === 'en') setLanguage(saved);
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function selectLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setOpen(false);
    window.localStorage.setItem('a11y-language', nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new CustomEvent('a11y-language-change', { detail: nextLanguage }));
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[#294967] hover:bg-[var(--color-surface-2)] focus-ring"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Changer de langue"
      >
        <span aria-hidden="true" className="text-base">◎</span>
        <span>{language.toUpperCase()}</span>
        <span aria-hidden="true" className="text-xs">⌄</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-36 rounded-xl border border-[var(--color-border)] bg-white p-1.5 shadow-[0_14px_30px_rgba(16,45,79,0.16)]" role="menu" aria-label="Langues disponibles">
          {(['fr', 'en'] as Language[]).map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={language === option}
              onClick={() => selectLanguage(option)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold text-[#294967] hover:bg-[#edf3f9] focus-ring"
            >
              {option === 'fr' ? 'Français' : 'English'}
              {language === option && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
