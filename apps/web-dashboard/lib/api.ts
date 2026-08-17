export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002';

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

export async function createSite(url: string, name: string, scanMode: 'single_page' | 'full_site' = 'single_page'): Promise<SiteApi> {
  const body: any = { url, name, scan_mode: scanMode };

  const res = await fetch(`${API_URL}/api/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
  max_pages?: number | null;
  scan_mode?: string | null;
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

export interface Fix {
  id: string;
  method?: string;
  code_diff?: string | null;
  applied_at?: string | null;
  status?: string | null;
}

export interface ViolationDetail extends Violation {
  diagnostic?: any;
  details?: any;
  fix?: Fix | null;
}

export async function fetchViolation(violationId: string): Promise<ViolationDetail> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/violations/${violationId}`, { cache: 'no-store' });
  } catch (e) {
    throw new Error(`Échec de la requête réseau: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('Violation introuvable (404)');
    let body = null;
    try { body = await res.json(); } catch {}
    throw new Error(body?.detail ?? `Erreur lors du chargement de la violation (${res.status})`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error('Réponse invalide du serveur lors du chargement de la violation');
  }
}

export async function analyzeViolation(violationId: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/violations/${violationId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (e) {
    throw new Error(`Échec de la requête réseau: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {}
    throw new Error(body?.detail ?? `Erreur lors de la demande d'analyse (${res.status})`);
  }
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
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

export async function triggerScan(siteId: string, scanMode: 'single_page' | 'full_site' = 'single_page', maxPages?: number, maxDepth?: number) {
  const body: any = { scan_mode: scanMode };
  if (maxPages !== undefined) body.max_pages = maxPages;
  if (maxDepth !== undefined) body.max_depth = maxDepth;

  const res = await fetch(`${API_URL}/api/sites/${siteId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {}
    throw new Error(body?.detail ?? `Erreur lors du déclenchement du scan (${res.status})`);
  }

  return res.json();
}
