'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchScan, ScanDetail } from '../../../lib/api';
import { deriveStepLabel, formatElapsed, estimateRemaining } from '../../../lib/scan-utils';
import ScoreCard from '../../../components/ScoreCard';

const REFRESH_INTERVAL_MS = 3000;

export default function ScanDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadScan = async () => {
      try {
        setError(null);
        const data = await fetchScan(id);
        if (active) setScan(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadScan();
    const interval = setInterval(loadScan, REFRESH_INTERVAL_MS);

    // Try Server-Sent Events (SSE) for real-time updates; fallback to polling
    let es: EventSource | null = null;
    try {
      const eventsUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002'}/api/scans/${id}/events`;
      es = new EventSource(eventsUrl);
      es.addEventListener('scan_update', (ev: any) => {
        try {
          const d = JSON.parse(ev.data);
          if (active) setScan((prev) => ({ ...(prev as any), ...d } as ScanDetail));
        } catch (e) {
          // ignore parse errors
        }
      });
      es.onerror = () => {
        // if SSE fails, close and rely on polling
        try { es?.close(); } catch (e) {}
        es = null;
      };
    } catch (e) {
      // EventSource not supported or failed to connect
      es = null;
    }
    return () => {
      active = false;
      clearInterval(interval);
      try { es?.close(); } catch (e) {}
    };
  }, [id]);

  if (loading) {
    return <p className="text-mineur">Chargement du scan...</p>;
  }

  if (error || !scan) {
    return <p className="text-bloquant">Erreur lors du chargement du scan: {error ?? 'Scan introuvable'}</p>;
  }

  const counters = [
    { label: 'Bloquant', value: scan.violations_critical, className: 'text-bloquant' },
    { label: 'Majeur', value: scan.violations_serious, className: 'text-majeur' },
    { label: 'Modéré', value: scan.violations_moderate, className: 'text-mineur' },
    { label: 'Mineur', value: scan.violations_minor, className: 'text-mineur' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Détails du scan</h1>
      <p className="text-mineur font-mono text-sm mb-6">Scan ID: {scan.id}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-1">
          <ScoreCard scan={scan} />
        </div>

        <div className="bg-white rounded-lg border border-border p-4 md:col-span-2">
          <div className="text-sm text-mineur mb-2">Détails des violations</div>
          <div className="flex flex-wrap gap-6">
            {counters.map((c) => (
              <div key={c.label} className="min-w-[120px]" tabIndex={0} role="group" aria-label={`${c.label} : ${c.value}`}>
                <div className={`font-mono text-2xl font-semibold ${c.className}`}>{c.value}</div>
                <div className="text-sm text-mineur">{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <div className="text-sm text-mineur mb-2">Statut du scan</div>
        <div className="font-medium capitalize">{scan.status}</div>

        {/* Progress UI */}
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center">
              {/* Spinner */}
              {scan.status !== 'completed' && (
                <svg className="animate-spin h-8 w-8 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              {scan.status === 'completed' && (
                <svg className="h-8 w-8 text-success" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              {/* Percentage */}
              <div className="text-2xl font-bold">
                {(() => {
                  const max = scan.max_pages || 1;
                  const pct = Math.round(((scan.pages_scanned || 0) / max) * 100);
                  return `${Math.min(100, pct)}%`;
                })()}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface rounded h-3 mt-2 overflow-hidden">
                <div
                  className="bg-[var(--color-primary)] h-3"
                  style={{ width: `${Math.min(100, Math.round(((scan.pages_scanned || 0) / (scan.max_pages || 1)) * 100))}%` }}
                />
              </div>

              {/* Step and timing */}
              <div className="mt-3 text-sm text-mineur">
                <div>Étape : {deriveStepLabel(scan.status)}</div>
                <div>
                  Temps écoulé : {formatElapsed(scan.started_at)} • Temps restant estimé : {estimateRemaining(scan.started_at, scan.pages_scanned, scan.max_pages)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link href={`/scans/${params.id}/violations`} className="text-brand font-medium hover:underline">
        Voir toutes les violations →
      </Link>
    </div>
  );
}

// helpers are now in lib/scan-utils
