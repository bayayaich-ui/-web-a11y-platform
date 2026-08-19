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
    return <p className="text-mineur">Chargement des violations...</p>;
  }

  if (error) {
    return <p className="text-bloquant">Erreur lors du chargement des violations: {error}</p>;
  }

  const triees = [...violations].sort((a, b) => {
    const order = { bloquant: 0, majeur: 1, mineur: 2 };
    return order[a.priority as any] - order[b.priority as any];
  });

    return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Diagnostic</p><h1 className="mt-2 font-display text-3xl font-bold text-[#102d4f]">Violations détectées</h1><p className="mt-2 text-[var(--color-muted)]">Chaque résultat indique où agir et pourquoi.</p></div>

      {triees.length === 0 ? (
        <p className="text-success font-medium">✅ Aucune violation détectée !</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {triees.map((v) => {
            const display = PRIORITY_DISPLAY[v.priority as any] ?? { label: v.priority, className: 'bg-[#edf3f9] text-[#294967] border-[var(--color-border)]' };
            return (
              <li key={v.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${display.className}`}>
                    {display.label}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-[#102d4f]">{v.message}</div>
                    <div className="mt-2 text-xs text-[var(--color-muted)]">
                      <span className="font-mono font-semibold">{v.rule}</span><span aria-hidden="true"> · </span>{v.page_url}
                    </div>
                  </div>
                </div>
                {v.element && (
                  <div className="text-xs font-mono text-mineur bg-surface p-3 rounded overflow-auto">
                    <div className="mb-1 font-semibold text-[var(--color-muted)]">Élément HTML affecté</div>
                    <code>{v.element}</code>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
