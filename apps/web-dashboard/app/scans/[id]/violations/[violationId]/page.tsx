'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchViolation, analyzeViolation, ViolationDetail } from '../../../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002';

export default function ViolationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawScanId = params?.id; // scan id in path
  const rawViolationId = params?.violationId ?? (params as Record<string, string | string[] | undefined> | undefined)?.violationid;
  const violationId = Array.isArray(rawViolationId) ? rawViolationId[0] : rawViolationId;
  const [violation, setViolation] = useState<ViolationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!violationId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchViolation(violationId);
        if (active) setViolation(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    // open SSE to receive analysis/fix updates
    let es: EventSource | null = null;
    const handleViolationUpdate = (ev: Event) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data);
        if (payload.diagnostic) setViolation((v) => v ? ({...v, diagnostic: payload.diagnostic}) : v);
        if (payload.fix) setViolation((v) => v ? ({...v, fix: payload.fix}) : v);
      } catch (e) {
        // ignore parse errors
      }
    };
    try {
      // Use absolute backend URL so SSE connects to the API server (dev server runs on different port)
      es = new EventSource(`${API_URL}/api/violations/${violationId}/events`);
      es.addEventListener('violation_update', handleViolationUpdate);
      es.onerror = () => { es?.close(); };
    } catch (e) {
      // EventSource not available or connection failed
    }

    return () => { active = false; es?.removeEventListener('violation_update', handleViolationUpdate); es?.close(); };
  }, [violationId]);

  const handleAnalyze = async () => {
    if (!violationId) return;
    setAnalyzing(true);
    setError(null);
    try {
      await analyzeViolation(violationId);
      // Result will arrive via SSE; just show queued state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <p className="text-mineur">Chargement du détail de la violation…</p>;
  if (error) return <p className="text-bloquant">Erreur: {error}</p>;
  if (!violation) return <p className="text-mineur">Violation introuvable</p>;

  const diagnostic = violation.diagnostic;
  const fix = violation.fix;
  const codeBefore = diagnostic?.offending_code || violation.details?.code || violation.element || '';
  const codeAfter = diagnostic?.code_corrige || diagnostic?.correction || '';
  const explanation = diagnostic?.explication_simple || diagnostic?.summary || '';
  const impactExplanation = diagnostic?.impact_utilisateur || diagnostic?.impact || diagnostic?.recommandation || '';
  const fixExplanation = diagnostic?.correction_explanation || diagnostic?.recommandation || '';

  return (
    <main className="mx-auto max-w-6xl space-y-8 pb-12">
      <button type="button" onClick={() => router.back()} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-2)] focus-ring">
        <span aria-hidden="true">&lt;-</span><span>Retour aux violations</span>
      </button>

      <header className="border-b border-[var(--color-border)] pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">Accessibility violation</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="max-w-4xl font-display text-3xl font-bold leading-tight text-[#102d4f] sm:text-4xl">{violation.message}</h1><p className="mt-3 font-mono text-sm text-[var(--color-muted)]">{violation.rule}</p></div>
          <span className="inline-flex w-fit rounded-full border border-majeur/30 bg-majeur/10 px-3 py-1.5 text-sm font-bold text-[#8a5200]">{violation.impact}</span>
        </div>
        <a href={violation.page_url} target="_blank" rel="noreferrer" className="mt-5 block max-w-full truncate text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline focus-ring">{violation.page_url}</a>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]" aria-label="Résumé de la violation">
        <div className="rounded-2xl border border-[#cfe0f2] bg-[#edf5fc] p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Résumé</p><h2 className="mt-2 font-display text-xl font-bold text-[#102d4f]">Comprendre le problème</h2><p className="mt-3 leading-7 text-[#294967]" aria-live="polite">{explanation || 'Aucune explication disponible.'}</p></div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Impact utilisateur</p><h2 className="mt-2 font-display text-xl font-bold text-[#102d4f]">Pourquoi est-ce important ?</h2><p className="mt-3 leading-7 text-[var(--color-muted)]">{impactExplanation || 'Information indisponible.'}</p></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]" aria-label="Recommandation et ressources">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Recommandation</p><p className="mt-3 leading-7 text-[var(--color-muted)]">{diagnostic?.recommandation || 'Aucune recommandation disponible.'}</p></div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Ressources</p>{diagnostic?.ressources?.length ? <ul className="mt-3 space-y-2 text-sm">{diagnostic.ressources.map((resource) => <li key={resource}><a href={resource} target="_blank" rel="noreferrer" className="break-all text-[var(--color-primary)] underline-offset-4 hover:underline focus-ring">{resource}</a></li>)}</ul> : <p className="mt-3 text-[var(--color-muted)]">Aucune ressource disponible.</p>}</div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-[#102d4f]">Élément concerné</h2><span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">HTML</span></div><pre className="max-h-44 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#132238] p-5 text-sm leading-6 text-[#e5f0fb]"><code>{violation.element || 'Aucun élément fourni.'}</code></pre></div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">WCAG</p><p className="mt-2 font-display text-2xl font-bold text-[#102d4f]">{violation.details?.wcag?.join(', ') ?? (Array.isArray(diagnostic?.wcag) ? diagnostic.wcag.join(', ') : diagnostic?.wcag) ?? 'N/A'}</p><p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Référence associée à cette règle d’accessibilité.</p></div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm" aria-label="Localisation dans le code source">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Localisation dans le code</p>
        <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
          {violation.source_file ? `${violation.source_file}${violation.source_line ? `:${violation.source_line}` : ''}${violation.source_column ? `:${violation.source_column}` : ''}` : 'Non disponible'}
        </p>
      </section>

      <section className="border-t border-[var(--color-border)] pt-8" aria-labelledby="remediation-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Remédiation</p><h2 id="remediation-title" className="mt-1 font-display text-2xl font-bold text-[#102d4f]">Correction proposée par l’IA</h2></div><button type="button" className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition-colors hover:bg-[#0f478d] focus-ring disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }} onClick={handleAnalyze} disabled={analyzing} aria-busy={analyzing}>{analyzing ? 'Analyse en cours…' : 'Analyser avec l’IA'}</button></div>
        <div className="mt-5">
          {codeAfter ? <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-[#efcaca] bg-[#fff8f7]"><div className="border-b border-[#efcaca] px-4 py-3 text-sm font-bold text-[#8f2d26]">Avant · élément détecté</div><pre className="max-h-64 overflow-auto p-4 text-sm leading-6 text-[#4a2522]"><code>{codeBefore}</code></pre></div>
              <div className="overflow-hidden rounded-xl border border-[#b9dfcb] bg-[#f4fbf7]"><div className="border-b border-[#b9dfcb] px-4 py-3 text-sm font-bold text-[#126342]">Après · correction proposée</div><pre className="max-h-64 overflow-auto p-4 text-sm leading-6 text-[#16452f]"><code>{codeAfter}</code></pre></div>
            </div>
            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-white p-5"><h3 className="font-display font-bold text-[#102d4f]">Pourquoi cette correction ?</h3><p className="mt-2 leading-7 text-[var(--color-muted)]">{fixExplanation || 'Correction générée à partir de la violation détectée.'}</p></div>
          </> : fix ? <div className="rounded-xl border border-[var(--color-border)] bg-white p-5"><h3 className="font-display font-bold text-[#102d4f]">Correction enregistrée</h3><pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[#132238] p-4 text-sm leading-6 text-[#e5f0fb]"><code>{fix.code_diff}</code></pre><p className="mt-3 leading-7 text-[var(--color-muted)]">{fixExplanation || 'Correction enregistrée par le backend.'}</p></div> : <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-sm text-[var(--color-muted)]">Aucune correction proposée pour le moment. Vous pouvez lancer une analyse IA.</div>}
        </div>
      </section>
    </main>
  );
}
