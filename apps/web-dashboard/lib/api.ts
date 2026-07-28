const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002';

export interface SiteApi {
  id: string;
  url: string;
  name: string;
  created_at: string;
  last_scan_score: number | null;
  last_scan_date: string | null;
  last_scan_id: string | null;
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

export interface ScanDetail {
  id: string;
  site_id: string;
  status: string;
  score_global: number | null;
  violations_critical: number;
  violations_serious: number;
  violations_moderate: number;
  violations_minor: number;
  pages_scanned: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface Violation {
  id: string;
  rule: string;
  impact: string;
  element: string;
  message: string;
  page_url: string;
  priority: string;
}

export async function fetchScan(scanId: string): Promise<ScanDetail> {
  const res = await fetch(`${API_URL}/api/scans/${scanId}`, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Scan introuvable (404)');
    }
    let body = null;
    try {
      body = await res.json();
    } catch {}
    throw new Error(body?.detail ?? `Erreur lors du chargement du scan (${res.status})`);
  }
  return res.json();
}

export async function fetchViolations(scanId: string): Promise<Violation[]> {
  const res = await fetch(`${API_URL}/api/scans/${scanId}/violations`, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Aucun scan trouvé pour récupérer les violations (404)');
    }
    let body = null;
    try {
      body = await res.json();
    } catch {}
    throw new Error(body?.detail ?? `Erreur lors du chargement des violations (${res.status})`);
  }
  return res.json();
}
