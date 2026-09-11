'use client';

import { useState } from 'react';
import { deleteSite, updateSite, type SiteApi } from '../lib/api';

export default function SiteActions({ site }: { site: SiteApi }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(site.name);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Le nom du site est obligatoire.'); return; }
    if (trimmed.length > 200) { setError('Le nom du site ne peut pas dépasser 200 caractères.'); return; }
    setBusy(true); setError(null);
    try { await updateSite(site.id, trimmed); setName(trimmed); setEditing(false); setMessage('Site modifié avec succès.'); window.location.reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Impossible de modifier le site. Veuillez réessayer.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm('Supprimer ce site ?\nCette action supprimera le site et les données associées selon les règles de conservation de la plateforme.')) return;
    setBusy(true); setError(null);
    try { await deleteSite(site.id); window.location.reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Impossible de supprimer le site. Veuillez réessayer.'); setBusy(false); }
  }

  if (editing) return <div className="w-full rounded-lg border border-[var(--color-border)] bg-[#f7faff] p-4"><h3 className="font-semibold text-[#102d4f]">Modifier le site</h3><label className="mt-3 block text-sm font-semibold">Nom du site<input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} className="mt-1 min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 focus-ring" autoFocus /></label><p className="mt-3 text-sm text-[var(--color-muted)]">URL : {site.url}</p><p className="mt-1 text-sm text-[var(--color-muted)]">Mode de scan : {site.scan_mode === 'full_site' ? 'Site complet' : 'Page unique'}</p>{error && <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}<div className="mt-4 flex gap-2"><button type="button" onClick={() => { setEditing(false); setError(null); }} disabled={busy} className="min-h-10 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold">Annuler</button><button type="button" onClick={save} disabled={busy} className="min-h-10 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-white">{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div></div>;

  return <div className="flex flex-wrap items-center gap-2"><a href={site.last_scan_id ? `/scans/${site.last_scan_id}` : '#'} aria-disabled={!site.last_scan_id} onClick={(event) => { if (!site.last_scan_id) event.preventDefault(); }} className="min-h-10 rounded-lg border border-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] focus-ring">Détails</a><button type="button" onClick={() => { setMessage(null); setEditing(true); }} disabled={busy} className="min-h-10 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[#102d4f] focus-ring">Modifier</button><button type="button" onClick={remove} disabled={busy} className="min-h-10 rounded-lg border border-[#efcaca] px-3 py-2 text-sm font-semibold text-[#8f2d26] focus-ring">Supprimer</button>{message && <span role="status" className="text-sm text-[#126342]">{message}</span>}{error && <span role="alert" className="text-sm text-[var(--color-danger)]">{error}</span>}</div>;
}