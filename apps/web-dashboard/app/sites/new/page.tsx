'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSite } from '../../../lib/api';
import Button from '../../../components/Button';
import Input from '../../../components/Input';

export default function NewSitePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [scanMode, setScanMode] = useState<'single_page' | 'full_site'>('single_page');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function urlValide(valeur: string): boolean {
    try {
      const parsed = new URL(valeur);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!urlValide(url)) {
      setErreur('Entrez une URL valide, incluant https:// ou http://');
      return;
    }
    setEnCours(true);
    try {
      await createSite(url, name, scanMode);
      router.push('/sites');
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Impossible d'ajouter ce site pour le moment.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">Configuration</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-[#102d4f] sm:text-4xl">Ajouter un site</h1>
        <p className="mt-3 leading-7 text-[var(--color-muted)]">Ajoutez un site à votre espace et lancez automatiquement votre premier diagnostic d’accessibilité.</p>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_14px_40px_rgba(16,45,79,0.08)] sm:p-8">
        <div className="flex items-start gap-4 border-b border-[var(--color-border)] pb-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf5fc] text-lg text-[var(--color-primary)]" aria-hidden="true">+</div>
          <div><h2 className="font-display text-xl font-bold text-[#102d4f]">Nouveau site</h2><p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">Configurez les informations de votre site avant de lancer le scan.</p></div>
        </div>

        <div className="mt-7 flex flex-col gap-6">
          <div><Input id="site-name" label="Nom du site" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Site vitrine client A" required className="min-h-12 rounded-lg bg-[#fbfdff]" /><p className="mt-1 text-xs text-[var(--color-muted)]">Un nom court pour identifier facilement ce site dans votre espace.</p></div>
          <div><Input id="site-url" label="URL du site" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://monsite.com" required aria-describedby={erreur ? 'site-url-erreur' : undefined} aria-invalid={!!erreur} className={`min-h-12 rounded-lg bg-[#fbfdff] ${erreur ? 'border-[var(--color-danger)]' : ''}`} /><p className="mt-1 text-xs text-[var(--color-muted)]">Entrez l’adresse complète du site à analyser.</p></div>

          {erreur && <p id="site-url-erreur" role="alert" className="-mt-3 rounded-lg border border-[#efcaca] bg-[#fff8f7] px-3 py-2 text-sm text-[var(--color-danger)]" aria-live="assertive">{erreur}</p>}

          <fieldset>
            <legend className="text-sm font-semibold text-[var(--color-ink)]">Mode de scan</legend>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Choisissez la profondeur de votre premier diagnostic.</p>
            <div className="mt-3 grid gap-3">
              <label className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#cfe0f2] ${scanMode === 'single_page' ? 'border-[var(--color-primary)] bg-[#edf5fc]' : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-2)]'}`}>
                <input type="radio" name="scan_mode" value="single_page" checked={scanMode === 'single_page'} onChange={() => setScanMode('single_page')} className="mt-1 h-4 w-4 accent-[var(--color-primary)]" />
                <span><span className="block font-semibold text-[#102d4f]">Scan d’une seule page</span><span className="mt-1 block text-sm text-[var(--color-muted)]">Rapide, idéal pour un premier diagnostic.</span></span>
              </label>
              <label className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#cfe0f2] ${scanMode === 'full_site' ? 'border-[var(--color-primary)] bg-[#edf5fc]' : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-2)]'}`}>
                <input type="radio" name="scan_mode" value="full_site" checked={scanMode === 'full_site'} onChange={() => setScanMode('full_site')} className="mt-1 h-4 w-4 accent-[var(--color-primary)]" />
                <span><span className="block font-semibold text-[#102d4f]">Scan complet du site</span><span className="mt-1 block text-sm text-[var(--color-muted)]">Analyse approfondie de plusieurs pages.</span></span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[var(--color-muted)]">Votre premier scan démarrera automatiquement après l’enregistrement.</p>
          <div className="flex flex-col gap-3 sm:flex-row"><Button variant="secondary" type="button" onClick={() => router.push('/sites')}>Annuler</Button><Button variant="primary" type="submit" disabled={enCours}>{enCours ? 'Ajout en cours…' : 'Ajouter et lancer le scan →'}</Button></div>
        </div>
      </form>
    </div>
  );
}
