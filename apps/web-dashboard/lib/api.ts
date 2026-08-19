import { mockSites, mockScans, mockViolations } from './mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002';

export interface AuthUser { id: string; email: string; name: string | null; created_at: string; }

async function authRequest(path: string, body: Record<string, string>) {
  try {
    const res = await fetch(`${API_URL}/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail ?? 'Impossible de contacter le service d’authentification.');
    return data as AuthUser;
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
    throw new Error('Le service est indisponible. Démarrez le backend sur le port 8002 puis réessayez.');
  }
}

export function registerUser(email: string, name: string, password: string) { return authRequest('register', { email, name, password }); }
export function loginUser(email: string, password: string) { return authRequest('login', { email, password }); }
export async function logoutUser() { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); }

export interface SiteApi {
  id: string;
  url: string;
  name: string;
  created_at: string;
  last_scan_score: number | null;
  last_scan_date: string | null;
  last_scan_id: string | null;
}

function toSiteApi(site: typeof mockSites[number]): SiteApi {
  return {
    id: site.id,
    url: site.url,
    name: site.name,
    created_at: new Date().toISOString(),
    last_scan_score: site.lastScanScore,
    last_scan_date: site.lastScanDate ? new Date(site.lastScanDate).toISOString() : null,
    last_scan_id: site.lastScanScore !== null ? 'scan-1' : null,
  };
}

function getMockSites(): SiteApi[] {
  return mockSites.map(toSiteApi);
}

export async function fetchSites(cookieHeader?: string): Promise<SiteApi[]> {
  if (!API_URL) return getMockSites();
  try {
    const res = await fetch(`${API_URL}/api/sites`, { cache: 'no-store', headers: cookieHeader ? { cookie: cookieHeader } : undefined, credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Erreur lors du chargement des sites (${res.status})`);
    }
    return res.json();
  } catch (error) {
    console.warn('Backend indisponible, utilisation des données de démonstration pour /sites', error);
    return getMockSites();
  }
}

export async function createSite(url: string, name: string, scanMode?: 'single_page' | 'full_site'): Promise<SiteApi> {
  if (!API_URL) return createDemoSite(url, name);
  try {
    const res = await fetch(`${API_URL}/api/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name, scan_mode: scanMode }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? `Erreur lors de la création du site (${res.status})`);
    }

    return res.json();
  } catch (error) {
    console.warn('Backend indisponible, création simulée du site en mode démonstration', error);
    const fallbackId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    return { id: fallbackId, url, name, created_at: new Date().toISOString(), last_scan_score: null, last_scan_date: null, last_scan_id: null };
  }
}

function createDemoSite(url: string, name: string): SiteApi {
  return { id: `demo-${Date.now()}`, url, name, created_at: new Date().toISOString(), last_scan_score: null, last_scan_date: null, last_scan_id: null };
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
  max_pages?: number;
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
  if (!API_URL) return getMockScan(scanId);
  try {
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
  } catch (error) {
    const mock = mockScans[scanId];
    if (!mock) throw error;
    console.warn('Backend indisponible, utilisation du scan de démonstration', error);
    return {
      id: mock.id,
      site_id: mock.siteId,
      status: mock.status,
      score_global: mock.scoreGlobal,
      violations_critical: mock.violationsCritical,
      violations_serious: mock.violationsSerious,
      violations_moderate: mock.violationsModerate,
      violations_minor: mock.violationsMinor,
      pages_scanned: 1,
      started_at: mock.finishedAt,
      finished_at: mock.finishedAt,
    };
  }
}

function getMockScan(scanId: string): ScanDetail {
  const mock = mockScans[scanId];
  if (!mock) throw new Error('Scan introuvable (404)');
  return { id: mock.id, site_id: mock.siteId, status: mock.status, score_global: mock.scoreGlobal, violations_critical: mock.violationsCritical, violations_serious: mock.violationsSerious, violations_moderate: mock.violationsModerate, violations_minor: mock.violationsMinor, pages_scanned: 1, started_at: mock.finishedAt, finished_at: mock.finishedAt };
}

export async function fetchViolations(scanId: string): Promise<Violation[]> {
  if (!API_URL) return getMockViolations();
  try {
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
  } catch (error) {
    if (!mockViolations.length) {
      throw error;
    }
    console.warn('Backend indisponible, utilisation des violations de démonstration', error);
    return mockViolations.map((violation) => ({
      id: violation.id,
      rule: violation.rule,
      impact: violation.priority,
      element: '',
      message: violation.titre,
      page_url: violation.pageUrl,
      priority: violation.priority,
    }));
  }
}

function getMockViolations(): Violation[] {
  return mockViolations.map((violation) => ({ id: violation.id, rule: violation.rule, impact: violation.priority, element: '', message: violation.titre, page_url: violation.pageUrl, priority: violation.priority }));
}
