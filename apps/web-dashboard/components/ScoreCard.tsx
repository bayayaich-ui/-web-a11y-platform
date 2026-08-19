import type { ScanDetail } from '../lib/api';

export default function ScoreCard({ scan }: { scan: ScanDetail }) {
  const score = scan.score_global ?? 0;
  const label = score >= 80 ? 'Bonne accessibilité' : score >= 50 ? 'À améliorer' : 'Action prioritaire';
  return <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6" aria-labelledby="score-title"><p id="score-title" className="text-sm font-semibold text-[var(--color-muted)]">Score d’accessibilité</p><div className="mt-4 flex items-end gap-2"><span className="font-display text-5xl font-bold text-[#102d4f]">{score.toFixed(0)}</span><span className="pb-2 text-lg text-[var(--color-muted)]">/100</span></div><p className="mt-3 inline-flex rounded-full bg-[#d7f0e6] px-3 py-1 text-sm font-semibold text-[#126342]">{label}</p></section>;
}