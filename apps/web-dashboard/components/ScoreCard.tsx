'use client';

import { useState } from 'react';
import { fetchScan, type ScanDetail } from '../lib/api';

export default function ScoreCard({ scan }: { scan: ScanDetail }) {
  const [score, setScore] = useState(scan.score_global);
  const [refreshing, setRefreshing] = useState(false);
  const numericScore = score ?? 0;
  const label = numericScore >= 80 ? 'Bonne accessibilité' : numericScore >= 50 ? 'À améliorer' : 'Action prioritaire';
  async function refreshScore() {
    setRefreshing(true);
    try {
      const refreshedScan = await fetchScan(scan.id);
      setScore(refreshedScan.score_global);
    } finally {
      setRefreshing(false);
    }
  }
  return <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6" aria-labelledby="score-title"><p id="score-title" className="text-sm font-semibold text-[var(--color-muted)]">Score d’accessibilité</p><div className="mt-4 flex items-end gap-2"><span className="font-display text-5xl font-bold text-[#102d4f]">{score === null ? 'N/A' : `${score.toFixed(0)}%`}</span>{score !== null && <span className="pb-2 text-lg text-[var(--color-muted)]">/100</span>}</div>{score !== null && <div className="mt-4 h-3 overflow-hidden rounded bg-[var(--color-surface-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={numericScore} aria-label="Score d’accessibilité"><div className="h-full bg-[var(--color-primary)]" style={{ width: `${numericScore}%` }} /></div>}<p className="mt-3 inline-flex rounded-full bg-[#d7f0e6] px-3 py-1 text-sm font-semibold text-[#126342]">{score === null ? 'Score indisponible' : label}</p><button type="button" className="mt-4 text-sm font-semibold text-brand hover:underline focus-ring" aria-label="Rafraîchir le score" onClick={refreshScore} disabled={refreshing}>{refreshing ? 'Actualisation…' : 'Rafraîchir'}</button></section>;
}