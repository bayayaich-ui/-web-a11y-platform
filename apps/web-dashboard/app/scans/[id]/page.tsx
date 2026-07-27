import Link from 'next/link';
import { mockScans, mockSites } from '../../../lib/mock-data';

export default function ScanDetailPage(props: any) {
  const params = props.params as { id: string };
  const scan = mockScans[params.id];
  const site = mockSites.find((s) => s.id === params.id);

  if (!scan || !site) {
    return <p>Scan introuvable.</p>;
  }

  const counters = [
    { label: 'Bloquant', value: scan.violationsCritical, className: 'text-bloquant' },
    { label: 'Majeur', value: scan.violationsSerious, className: 'text-majeur' },
    { label: 'Modéré', value: scan.violationsModerate, className: 'text-mineur' },
    { label: 'Mineur', value: scan.violationsMinor, className: 'text-mineur' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">{site.name}</h1>
      <p className="text-mineur font-mono text-sm mb-6">{site.url}</p>

      <div className="bg-white rounded-lg border border-border p-6 mb-6 flex items-center gap-8">
        <div>
          <div className="text-sm text-mineur mb-1">Score de conformité</div>
          <div className="font-mono text-4xl font-bold text-success">
            {scan.scoreGlobal.toFixed(1)}%
          </div>
        </div>
        <div className="flex gap-6">
          {counters.map((c) => (
            <div key={c.label}>
              <div className={`font-mono text-2xl font-semibold ${c.className}`}>{c.value}</div>
              <div className="text-sm text-mineur">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Link href={`/scans/${params.id}/violations`} className="text-brand font-medium hover:underline">
        Voir toutes les violations →
      </Link>
    </div>
  );
}