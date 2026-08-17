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
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Violations détectées</h1>

      {triees.length === 0 ? (
        <p className="text-success font-medium">✅ Aucune violation détectée !</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {triees.map((v) => {
            const display = PRIORITY_DISPLAY[v.priority as any];
            return (
              <li key={v.id} className="bg-white rounded-lg border border-border p-4 flex flex-col gap-2">
                <div className="flex items-start gap-4">
                  <span className={`shrink-0 px-2 py-1 rounded text-xs font-semibold border ${display.className}`}>
                    {display.label}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium"><Link href={`/scans/${id}/violations/${v.id}`}>{v.message}</Link></div>
                    <div className="text-sm text-mineur font-mono">
                      {v.rule} · {v.page_url}
                    </div>
                  </div>
                </div>
                {v.element && (
                  <div className="text-xs font-mono text-mineur bg-surface p-3 rounded overflow-auto">
                    <div className="text-mineur mb-1">Element HTML:</div>
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
