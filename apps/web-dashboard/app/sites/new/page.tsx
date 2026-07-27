'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSite } from '../../../lib/api';

export default function NewSitePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
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
      await createSite(url, name);
      router.push('/sites');
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Impossible d'ajouter ce site pour le moment.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold mb-2">Ajouter un site</h1>
      <p className="text-mineur mb-6">
        Le premier scan démarrera automatiquement une fois le site enregistré.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 flex flex-col gap-5">
        <div>
          <label htmlFor="site-name" className="block text-sm font-medium mb-1">
            Nom du site
          </label>
          <input
            id="site-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Site vitrine client A"
            required
            className="w-full px-3 py-2 rounded border border-border focus-visible:outline-brand"
          />
        </div>

        <div>
          <label htmlFor="site-url" className="block text-sm font-medium mb-1">
            URL du site
          </label>
          <input
            id="site-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://monsite.com"
            required
            aria-describedby={erreur ? 'site-url-erreur' : undefined}
            aria-invalid={!!erreur}
            className="w-full px-3 py-2 rounded border border-border font-mono text-sm focus-visible:outline-brand"
          />
        </div>

        {erreur && (
          <p id="site-url-erreur" role="alert" className="text-bloquant text-sm">
            {erreur}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push('/sites')}
            className="px-4 py-2 rounded border border-border font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={enCours}
            className="px-4 py-2 rounded bg-brand text-white font-medium disabled:opacity-50"
          >
            {enCours ? 'Ajout en cours…' : 'Ajouter et lancer le scan'}
          </button>
        </div>
      </form>
    </div>
  );
}