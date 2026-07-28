'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchScan, ScanDetail } from '../../../lib/api';

const REFRESH_INTERVAL_MS = 3000;

export default function ScanDetailPage() {
  const params = useParams();
  const id = params?.id;
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
    return () => {
      active = false;
      clearInterval(interval);
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

      <div className="bg-white rounded-lg border border-border p-6 mb-6 flex flex-col gap-6 md:flex-row md:items-center">
        <div>
          <div className="text-sm text-mineur mb-1">Score de conformité</div>
          <div className="font-mono text-4xl font-bold text-success">{scan.score_global?.toFixed(1) ?? 'N/A'}%</div>
        </div>

        <div className="flex flex-wrap gap-6">
          {counters.map((c) => (
            <div key={c.label}>
              <div className={`font-mono text-2xl font-semibold ${c.className}`}>{c.value}</div>
              <div className="text-sm text-mineur">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <div className="text-sm text-mineur mb-2">Statut du scan</div>
        <div className="font-medium capitalize">{scan.status}</div>
        {scan.pages_scanned !== null && scan.pages_scanned !== undefined && (
          <div className="text-sm text-mineur mt-2">Pages scannées: {scan.pages_scanned}</div>
        )}
      </div>

      <Link href={`/scans/${params.id}/violations`} className="text-brand font-medium hover:underline">
        Voir toutes les violations →
      </Link>
    </div>
  );
}
