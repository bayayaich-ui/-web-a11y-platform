'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchGlobalViolations, GlobalViolation } from '../../lib/api';
import { ModuleIntro } from '../../components/ModuleIntro';
import { PRIORITY_DISPLAY } from '../../lib/types';

const REFRESH_INTERVAL_MS = 5000;

export default function ViolationsPage() {
  const [violations, setViolations] = useState<GlobalViolation[]>([]);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [rule, setRule] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchGlobalViolations();
        if (active) { setViolations(data); setError(null); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const rules = [...new Set(violations.map((violation) => violation.rule))].sort();
  const filtered = violations.filter((violation) => {
    const matchesQuery = !normalizedQuery || [violation.message, violation.rule, violation.page_url, violation.site_name].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (priority === 'all' || violation.priority === priority) && (rule === 'all' || violation.rule === rule);
  });
  const count = (value: string) => violations.filter((violation) => violation.priority === value).length;

  if (loading) return <div className="space-y-6" aria-busy="true"><ModuleIntro eyebrow="Conformité" title="Violations" description="Retrouvez les problèmes détectés sur l’ensemble de vos sites et priorisez les corrections." /><div className="h-40 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" /></div>;
  if (error) return <div className="space-y-6"><ModuleIntro eyebrow="Conformité" title="Violations" description="Retrouvez les problèmes détectés sur l’ensemble de vos sites et priorisez les corrections." /><section className="rounded-2xl border border-[#efcaca] bg-[#fff8f7] p-8" role="alert"><h2 className="font-display text-xl font-bold text-[#8f2d26]">Impossible de charger les violations</h2><p className="mt-2 text-[var(--color-muted)]">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-lg px-4 text-sm font-bold text-white focus-ring" style={{ backgroundColor: '#1457a6' }}>Réessayer</button></section></div>;

  return (
    <div className="space-y-7 pb-10">
      <ModuleIntro eyebrow="Conformité" title="Violations" description="Retrouvez les problèmes détectés sur l’ensemble de vos sites et priorisez les corrections." />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Résumé global des violations">
        <Kpi label="Total" value={violations.length} tone="blue" /><Kpi label="Bloquantes" value={count('bloquant')} tone="red" /><Kpi label="Majeures" value={count('majeur')} tone="amber" /><Kpi label="Mineures" value={count('mineur')} tone="slate" />
      </section>
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm" aria-label="Filtres globaux"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,220px)]"><input aria-label="Rechercher une violation" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une violation..." className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[#fbfdff] px-3 text-sm outline-none focus:border-[var(--color-primary)]" /><select aria-label="Filtrer par gravité" value={priority} onChange={(event) => setPriority(event.target.value)} className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[#fbfdff] px-3 text-sm"><option value="all">Toutes les gravités</option><option value="bloquant">Bloquantes</option><option value="majeur">Majeures</option><option value="mineur">Mineures</option></select><select aria-label="Filtrer par règle" value={rule} onChange={(event) => setRule(event.target.value)} className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[#fbfdff] px-3 text-sm"><option value="all">Toutes les règles</option>{rules.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><p className="mt-3 text-xs text-[var(--color-muted)]" aria-live="polite">{filtered.length} résultat{filtered.length === 1 ? '' : 's'} affiché{filtered.length === 1 ? '' : 's'}</p></section>
      {filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-10 text-center"><h2 className="font-display text-xl font-bold text-[#102d4f]">Aucune violation trouvée</h2><p className="mt-2 text-[var(--color-muted)]">Les résultats réels correspondant à vos filtres apparaîtront ici.</p></section> : <ul className="grid gap-4 lg:grid-cols-2">{filtered.map((violation) => { const display = PRIORITY_DISPLAY[violation.priority as keyof typeof PRIORITY_DISPLAY] ?? { label: violation.priority, className: 'bg-[#edf3f9] text-[#294967] border-[var(--color-border)]' }; return <li key={violation.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${display.className}`}>{display.label}</span><div className="min-w-0 flex-1"><h2 className="font-display font-bold leading-6 text-[#102d4f]">{violation.message}</h2><p className="mt-2 truncate text-xs text-[var(--color-muted)]"><span className="font-mono font-semibold">{violation.rule}</span> · {violation.site_name}</p></div></div><p className="text-sm text-[var(--color-muted)]">{violation.page_url}</p><p className="font-mono text-xs text-[var(--color-muted)]">{violation.source_file ? `${violation.source_file}${violation.source_line ? `:${violation.source_line}` : ''}${violation.source_column ? `:${violation.source_column}` : ''}` : 'Localisation non disponible'}</p><div className="flex flex-wrap items-center gap-3"><Link href={`/scans/${violation.scan_id}/violations/${violation.id}`} className="inline-flex min-h-10 items-center rounded-lg px-4 py-2 text-sm font-semibold text-white focus-ring" style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}>Voir les détails</Link><span className="text-xs text-[var(--color-muted)]">{violation.has_diagnostic ? 'Diagnostic LLM disponible' : 'Diagnostic en attente'} · {violation.has_fix ? 'Correction disponible' : 'Correction en attente'}</span></div></li>; })}</ul>}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'red' | 'amber' | 'slate' }) { const styles = { blue: 'bg-[#edf5fc] text-[#1457a6]', red: 'bg-[#fff1f0] text-[#a5352d]', amber: 'bg-[#fff7e8] text-[#8a5200]', slate: 'bg-[#edf3f9] text-[#294967]' }; return <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[var(--color-muted)]">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-lg font-bold ${styles[tone]}`} aria-hidden="true">{tone === 'red' ? '!' : tone === 'amber' ? '↑' : tone === 'slate' ? '·' : '/'}</span></div><p className="mt-3 font-display text-3xl font-bold text-[#102d4f]">{value}</p></article>; }