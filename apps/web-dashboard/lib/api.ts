const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

export interface SiteApi {
  id: string;
  url: string;
  name: string;
  created_at: string;
  last_scan_score: number | null;
  last_scan_date: string | null;
}

export async function fetchSites(): Promise<SiteApi[]> {
  const res = await fetch(`${API_URL}/api/sites`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Erreur lors du chargement des sites (${res.status})`);
  }
  return res.json();
}

export async function createSite(url: string, name: string): Promise<SiteApi> {
  const res = await fetch(`${API_URL}/api/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Erreur lors de la création du site (${res.status})`);
  }

  return res.json();
}
