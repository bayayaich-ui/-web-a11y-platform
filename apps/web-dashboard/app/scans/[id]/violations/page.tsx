 'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchViolations, Violation } from '../../../../lib/api';
import { PRIORITY_DISPLAY } from '../../../../lib/types';

const REFRESH_INTERVAL_MS = 3000;

export default function ViolationsPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ruleFilter, setRuleFilter] = useState('all');

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadViolations = async () => {
      try {
        setError(null);
        const data = await fetchViolations(id);
        if (active) setViolations(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadViolations();
    const interval = setInterval(loadViolations, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return <div className="space-y-6" aria-busy="true" aria-label="Chargement des violations"><div className="h-6 w-28 animate-pulse rounded bg-[var(--color-surface-2)]" /><div className="h-12 w-2/3 animate-pulse rounded bg-[var(--color-surface-2)]" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />)}</div><div className="h-36 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" /></div>;
  }

  if (error) {
    return <section className="rounded-2xl border border-[#efcaca] bg-[#fff8f7] p-8" role="alert"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8f2d26]">Diagnostic indisponible</p><h1 className="mt-2 font-display text-2xl font-bold text-[#102d4f]">Impossible de charger les violations</h1><p className="mt-2 text-[var(--color-muted)]">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-lg px-4 text-sm font-bold text-white focus-ring" style={{ backgroundColor: '#1457a6' }}>Réessayer</button></section>;
  }

  const triees = [...violations].sort((a, b) => {
    const order = { bloquant: 0, majeur: 1, mineur: 2 };
    return order[a.priority as any] - order[b.priority as any];
  });
  const normalizedQuery = query.trim().toLowerCase();
  const rules = [...new Set(violations.map((violation) => violation.rule))].sort();
  const filteredViolations = triees.filter((violation) => {
    const matchesQuery = !normalizedQuery || [violation.message, violation.rule, violation.page_url, violation.element].some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesPriority = priorityFilter === 'all' || violation.priority === priorityFilter;
    const matchesRule = ruleFilter === 'all' || violation.rule === ruleFilter;
    return matchesQuery && matchesPriority && matchesRule;
  });
  const counts = {
    total: violations.length,
    bloquant: violations.filter((violation) => violation.priority === 'bloquant').length,
    majeur: violations.filter((violation) => violation.priority === 'majeur').length,
    mineur: violations.filter((violation) => violation.priority === 'mineur').length,
  };

    return (
    <div className="space-y-7 pb-10">
      <header className="flex flex-col justify-between gap-5 border-b border-[var(--color-border)] pb-6 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">Diagnostic</p><h1 className="mt-2 font-display text-3xl font-bold text-[#102d4f] sm:text-4xl">Violations détectées</h1><p className="mt-2 max-w-2xl text-[var(--color-muted)]">Identifiez les problèmes d’accessibilité et priorisez les corrections importantes.</p></div><p className="text-sm font-semibold text-[var(--color-muted)]">{counts.total} résultat{counts.total === 1 ? '' : 's'} sur ce scan</p></header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Résumé des violations">
        <Kpi label="Total" value={counts.total} tone="blue" icon="/" />
        <Kpi label="Bloquantes" value={counts.bloquant} tone="red" icon="!" />
        <Kpi label="Majeures" value={counts.majeur} tone="amber" icon="↑" />
        <Kpi label="Mineures" value={counts.mineur} tone="slate" icon="·" />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm" aria-label="Filtres des violations"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,220px)]"><label className="block"><span className="sr-only">Rechercher une violation</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une violation..." className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[#fbfdff] px-3 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#cfe0f2]" /></label><label className="block"><span className="sr-only">Filtrer par gravité</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[#fbfdff] px-3 text-sm text-[#132238] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#cfe0f2]"><option value="all">Toutes les gravités</option><option value="bloquant">Bloquantes</option><option value="majeur">Majeures</option><option value="mineur">Mineures</option></select></label><label className="block"><span className="sr-only">Filtrer par règle</span><select value={ruleFilter} onChange={(event) => setRuleFilter(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[#fbfdff] px-3 text-sm text-[#132238] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#cfe0f2]"><option value="all">Toutes les règles</option>{rules.map((rule) => <option key={rule} value={rule}>{rule}</option>)}</select></label></div><p className="mt-3 text-xs text-[var(--color-muted)]" aria-live="polite">{filteredViolations.length} résultat{filteredViolations.length === 1 ? '' : 's'} affiché{filteredViolations.length === 1 ? '' : 's'}</p></section>

      {violations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#b9dfcb] bg-[#f4fbf7] p-10 text-center"><p className="text-3xl" aria-hidden="true">✓</p><h2 className="mt-3 font-display text-xl font-bold text-[#126342]">Aucun problème détecté</h2><p className="mt-2 text-[var(--color-muted)]">Votre page respecte les règles analysées lors du dernier scan.</p></section>
      ) : filteredViolations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-10 text-center"><h2 className="font-display text-xl font-bold text-[#102d4f]">Aucun résultat pour ces filtres</h2><p className="mt-2 text-[var(--color-muted)]">Modifiez votre recherche ou réinitialisez les filtres.</p><button type="button" onClick={() => { setQuery(''); setPriorityFilter('all'); setRuleFilter('all'); }} className="mt-5 min-h-11 rounded-lg border border-[var(--color-border)] px-4 text-sm font-bold text-[#102d4f] hover:bg-[var(--color-surface-2)] focus-ring">Réinitialiser</button></section>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {filteredViolations.map((v) => {
            const display = PRIORITY_DISPLAY[v.priority as any] ?? { label: v.priority, className: 'bg-[#edf3f9] text-[#294967] border-[var(--color-border)]' };
            const violationHref = `/scans/${id}/violations/${encodeURIComponent(String(v.id))}`;
            return (
              <li key={v.id} className="group flex min-w-0 flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
                <div className="flex items-start gap-4">
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${display.className}`}>
                    {display.label}
                  </span>
                  <div className="flex-1">
                    <div className="font-display font-bold leading-6 text-[#102d4f]">{v.message}</div>
                    <div className="mt-2 text-xs text-[var(--color-muted)]">
                      <span className="font-mono font-semibold">{v.rule}</span><span aria-hidden="true"> · </span>{v.page_url}
                    </div>
                  </div>
                </div>
                {v.element && (
                  <div className="rounded-lg bg-[var(--color-surface-2)] p-3 text-xs font-mono text-[var(--color-muted)]">
                    <div className="mb-1 font-semibold text-[var(--color-muted)]">Élément HTML affecté</div>
                    <code>{v.element}</code>
                  </div>
                )}
                <div className="rounded-lg border border-[var(--color-border)] bg-[#f7faff] p-3 text-xs text-[var(--color-muted)]">
                  <div className="mb-1 font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Localisation dans le code</div>
                  <div className="font-mono text-[var(--color-muted)]">
                    {v.source_file ? `${v.source_file}${v.source_line ? `:${v.source_line}` : ''}${v.source_column ? `:${v.source_column}` : ''}` : 'Non disponible'}
                  </div>
                </div>
                <Link
                  href={violationHref}
                  className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-[#0f478d] focus-ring"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
                >
                  <span>Voir les détails</span><span aria-hidden="true">-&gt;</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone: 'blue' | 'red' | 'amber' | 'slate'; icon: string }) {
  const styles = { blue: 'bg-[#edf5fc] text-[#1457a6]', red: 'bg-[#fff1f0] text-[#a5352d]', amber: 'bg-[#fff7e8] text-[#8a5200]', slate: 'bg-[#edf3f9] text-[#294967]' };
  return <article className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[var(--color-muted)]">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-lg font-bold ${styles[tone]}`} aria-hidden="true">{icon}</span></div><p className="mt-3 font-display text-3xl font-bold text-[#102d4f]">{value}</p></article>;
}
