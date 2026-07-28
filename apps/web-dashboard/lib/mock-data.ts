import { Site, ScanSummary, ViolationRow } from './types';

export const mockSites: Site[] = [
  { id: '1', url: 'https://client-a.com', name: 'Client A — Site vitrine', lastScanScore: 87.4, lastScanDate: '2026-07-24' },
  { id: '2', url: 'https://client-b.com', name: 'Client B — E-commerce', lastScanScore: 62.1, lastScanDate: '2026-07-23' },
  { id: '3', url: 'https://client-c.com', name: 'Client C — Portail RH', lastScanScore: null, lastScanDate: null },
];

export const mockScans: Record<string, ScanSummary> = {
  '1': { id: 'scan-1', siteId: '1', status: 'completed', scoreGlobal: 87.4, violationsCritical: 2, violationsSerious: 5, violationsModerate: 8, violationsMinor: 12, finishedAt: '2026-07-24T10:04:32Z' },
};

export const mockViolations: ViolationRow[] = [
  { id: 'v1', rule: 'color-contrast', priority: 'bloquant', titre: 'Contraste insuffisant sur les boutons principaux', pageUrl: '/contact' },
  { id: 'v2', rule: 'image-alt', priority: 'bloquant', titre: 'Images sans texte alternatif', pageUrl: '/accueil' },
  { id: 'v3', rule: 'aria-required-attr', priority: 'majeur', titre: 'Champ de formulaire sans étiquette accessible', pageUrl: '/contact' },
  { id: 'v4', rule: 'link-name', priority: 'mineur', titre: 'Liens sans texte discernable', pageUrl: '/a-propos' },
];