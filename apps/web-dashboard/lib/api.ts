import { mockSites, mockScans, mockViolations } from './mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002';

export interface AuthUser { id: string; email: string; name: string | null; created_at: string; }

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { cache: 'no-store', credentials: 'include' });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new AuthRequestError(data?.detail ?? 'Impossible de récupérer la session.', res.status);
  return data as AuthUser;
}

export class AuthRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

async function authRequest(path: string, body: Record<string, string>) {
  try {
    const res = await fetch(`${API_URL}/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AuthRequestError(data?.detail ?? `Le serveur a retourné une erreur (${res.status}).`, res.status);
    }
    return data as AuthUser;
  } catch (error) {
    if (error instanceof AuthRequestError) throw error;
    if (error instanceof TypeError || (error instanceof Error && error.message === 'Failed to fetch')) {
      throw new AuthRequestError('Le backend est inaccessible. Vérifiez qu’il fonctionne sur le port 8002.', 0);
    }
    throw new AuthRequestError('Le serveur n’a pas pu traiter la demande.', 500);
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
  last_scan_mode: 'single_page' | 'full_site' | null;
  scan_mode?: 'single_page' | 'full_site' | null;
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
    last_scan_mode: site.lastScanScore !== null ? 'single_page' : null,
    scan_mode: site.lastScanScore !== null ? 'single_page' : null,
  };
}

function getMockSites(): SiteApi[] {
  return mockSites.map(toSiteApi);
}

export function resolveScanMode(site: Pick<SiteApi, 'scan_mode' | 'last_scan_mode' | 'last_scan_score' | 'last_scan_date'>): 'single_page' | 'full_site' | null {
  const mode = site.scan_mode ?? site.last_scan_mode;
  if (mode === 'single_page' || mode === 'full_site') return mode;
  if (site.scan_mode === null && site.last_scan_mode === null && (site.last_scan_score !== null || site.last_scan_date !== null)) return 'single_page';
  return null;
}

export async function fetchSites(cookieHeader?: string): Promise<SiteApi[]> {
  if (!API_URL) return getMockSites();
  const res = await fetch(`${API_URL}/api/sites`, { cache: 'no-store', headers: cookieHeader ? { cookie: cookieHeader } : undefined, credentials: 'include' });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error(`Erreur lors du chargement des sites (${res.status})`);
  return res.json();
}

export async function createSite(url: string, name: string, scanMode?: 'single_page' | 'full_site'): Promise<SiteApi> {
  if (!API_URL) return createDemoSite(url, name);
  const res = await fetch(`${API_URL}/api/sites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ url, name, scan_mode: scanMode }) });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Erreur lors de la création du site (${res.status})`);
  }
  return res.json();
}

export async function updateSite(siteId: string, name: string): Promise<SiteApi> {
  const res = await fetch(`${API_URL}/api/sites/${encodeURIComponent(siteId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors de la modification du site (${res.status})`);
  return data as SiteApi;
}

export async function deleteSite(siteId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/sites/${encodeURIComponent(siteId)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail ?? `Erreur lors de la suppression du site (${res.status})`);
  }
}
function createDemoSite(url: string, name: string): SiteApi {
  return { id: `demo-${Date.now()}`, url, name, created_at: new Date().toISOString(), last_scan_score: null, last_scan_date: null, last_scan_id: null, last_scan_mode: null };
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
  pages_failed: number;
  progress: number;
  current_step: string;
  error: string | null;
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
  source_file?: string | null;
  source_line?: number | null;
  source_column?: number | null;
}

export interface GlobalViolation extends Violation {
  scan_id: string;
  site_id: string;
  site_name: string;
  has_diagnostic: boolean;
  has_fix: boolean;
}

export interface ViolationDetail extends Violation {
  diagnostic: ViolationDiagnostic | null;
  details: { wcag?: string[]; code?: string; source_file?: string | null; source_line?: number | null; source_column?: number | null } | null;
  fix: { id: string; method: string | null; code_diff: string | null; applied_at: string | null; status: string | null } | null;
}

export interface ReportViolation {
  id: string;
  page_url: string;
  rule: string;
  impact: string;
  message: string | null;
  element: string | null;
  source_file?: string | null;
  source_line?: number | null;
  source_column?: number | null;
  wcag: string[] | string | null;
  diagnostic: ViolationDiagnostic | null;
  explanation: string | null;
  recommendation: string | null;
  corrected_code: string | null;
  fix: { method: string | null; code_diff: string | null } | null;
}

export interface Report {
  id: string;
  scan_id: string;
  site_id: string;
  site_name: string;
  website_url: string;
  score: number | null;
  total_violations: number;
  scan_mode: string | null;
  scan_date: string | null;
  generated_at: string;
  content?: {
    pages_scanned: number;
    pages_failed: number;
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    violations: ReportViolation[];
  };
}

export interface ViolationDiagnostic {
  titre?: string;
  severite?: string;
  explication_simple?: string;
  impact_utilisateur?: string;
  recommandation?: string;
  code_corrige?: string;
  summary?: string;
  impact?: string;
  correction?: string;
  correction_explanation?: string;
  offending_code?: string;
  wcag?: string | string[];
  ressources?: string[];
}

export async function triggerScan(siteId: string, scanMode: 'single_page' | 'full_site') {
  const res = await fetch(`${API_URL}/api/sites/${siteId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ scan_mode: scanMode }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors du lancement du scan (${res.status})`);
  return data as { scan_id: string; scan_mode: string };
}

export async function generateReport(scanId: string): Promise<Report> {
  const res = await fetch(`${API_URL}/api/reports/scan/${scanId}`, { method: 'POST', credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors de la génération du rapport (${res.status})`);
  return data as Report;
}

export async function fetchReports(cookieHeader?: string): Promise<Report[]> {
  const res = await fetch(`${API_URL}/api/reports`, { cache: 'no-store', credentials: 'include', headers: cookieHeader ? { cookie: cookieHeader } : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors du chargement des rapports (${res.status})`);
  return data as Report[];
}

export async function fetchReport(reportId: string, cookieHeader?: string): Promise<Report> {
  const res = await fetch(`${API_URL}/api/reports/${reportId}`, { cache: 'no-store', credentials: 'include', headers: cookieHeader ? { cookie: cookieHeader } : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors du chargement du rapport (${res.status})`);
  return data as Report;
}

export async function fetchViolation(violationId: string): Promise<ViolationDetail> {
  const res = await fetch(`${API_URL}/api/violations/${encodeURIComponent(violationId)}`, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors du chargement de la violation (${res.status})`);
  return data as ViolationDetail;
}

export async function fetchGlobalViolations(): Promise<GlobalViolation[]> {
  const res = await fetch(`${API_URL}/api/violations`, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors du chargement des violations (${res.status})`);
  return data as GlobalViolation[];
}

export async function analyzeViolation(violationId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/violations/${encodeURIComponent(violationId)}/analyze`, { method: 'POST', credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Erreur lors de l'analyse (${res.status})`);
}

export async function fetchScan(scanId: string): Promise<ScanDetail> {
  if (!API_URL) return getMockScan(scanId);
  try {
    const res = await fetch(`${API_URL}/api/scans/${scanId}`, { cache: 'no-store', credentials: 'include' });
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
      pages_failed: 0,
      progress: 100,
      current_step: 'completed',
      error: null,
      started_at: mock.finishedAt,
      finished_at: mock.finishedAt,
    };
  }
}

function getMockScan(scanId: string): ScanDetail {
  const mock = mockScans[scanId];
  if (!mock) throw new Error('Scan introuvable (404)');
  return { id: mock.id, site_id: mock.siteId, status: mock.status, score_global: mock.scoreGlobal, violations_critical: mock.violationsCritical, violations_serious: mock.violationsSerious, violations_moderate: mock.violationsModerate, violations_minor: mock.violationsMinor, pages_scanned: 1, pages_failed: 0, progress: 100, current_step: 'completed', error: null, started_at: mock.finishedAt, finished_at: mock.finishedAt };
}

export async function fetchViolations(scanId: string): Promise<Violation[]> {
  if (!API_URL) return getMockViolations();
  const res = await fetch(`${API_URL}/api/scans/${scanId}/violations`, { cache: 'no-store', credentials: 'include' });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Aucun scan trouvé pour récupérer les violations (404)');
    }
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Erreur lors du chargement des violations (${res.status})`);
  }
  return res.json();
}

function getMockViolations(): Violation[] {
  return mockViolations.map((violation) => ({ id: violation.id, rule: violation.rule, impact: violation.priority, element: '', message: violation.titre, page_url: violation.pageUrl, priority: violation.priority }));
}
