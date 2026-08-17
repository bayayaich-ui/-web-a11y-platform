import Link from 'next/link';
import { fetchSites } from '../../lib/api';
import StartScanButtons from '../../components/StartScanButtons';

function scoreColor(score: number | null) {
  if (score === null) return 'text-mineur';
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-majeur';
  return 'text-bloquant';
}

export default async function SitesPage() {
  const sites = await fetchSites();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Vos sites</h1>
        <Link href="/sites/new">
          <button className="px-4 py-2 rounded bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-medium hover:opacity-95 focus-ring min-touch">
            + Ajouter un site
          </button>
        </Link>
      </div>

      {sites.length === 0 ? (
        <p className="text-mineur">Aucun site enregistré pour l'instant.</p>
      ) : (
        <table className="w-full bg-white rounded-lg border border-border overflow-hidden">
          <thead className="bg-surface text-left text-sm text-mineur">
            <tr>
              <th scope="col" className="px-4 py-3">Site</th>
              <th scope="col" className="px-4 py-3">Dernier score</th>
              <th scope="col" className="px-4 py-3">Dernier scan</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id} className="border-t border-border">
                <td className="px-4 py-4">
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-mineur font-mono">{site.url}</div>
                </td>
                <td className="px-4 py-4">
                  {site.last_scan_score !== null ? (
                    <span className={`font-mono font-semibold ${scoreColor(site.last_scan_score)}`}>
                      {site.last_scan_score.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-mineur text-sm">Pas encore scanné</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-mineur">
                  {site.last_scan_date ? new Date(site.last_scan_date).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <StartScanButtons siteId={site.id} />
                    {site.last_scan_id ? (
                      <Link href={`/scans/${site.last_scan_id}`} className="text-[var(--color-primary)] font-medium hover:underline">
                        Voir le détail →
                      </Link>
                    ) : (
                      <span className="text-mineur text-sm">Aucun scan disponible</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}