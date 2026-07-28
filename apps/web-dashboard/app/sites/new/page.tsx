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
        <Input
          id="site-name"
          label="Nom du site"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Site vitrine client A"
          required
        />

        <Input
          id="site-url"
          label="URL du site"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://monsite.com"
          required
          aria-describedby={erreur ? 'site-url-erreur' : undefined}
          aria-invalid={!!erreur}
        />

        {erreur && (
          <p id="site-url-erreur" role="alert" className="text-[var(--color-danger)] text-sm" aria-live="assertive">
            {erreur}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" type="button" onClick={() => router.push('/sites')}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" disabled={enCours}>
            {enCours ? 'Ajout en cours…' : 'Ajouter et lancer le scan'}
          </Button>
        </div>
      </form>
    </div>
  );
}