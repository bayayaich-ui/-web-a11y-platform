export interface Site {
    id: string;
    url: string;
    name: string;
    lastScanScore: number | null;
    lastScanDate: string | null;
  }
  
  export interface ScanSummary {
    id: string;
    siteId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    scoreGlobal: number;
    violationsCritical: number;
    violationsSerious: number;
    violationsModerate: number;
    violationsMinor: number;
    finishedAt: string;
  }
  
  export type Priority = 'bloquant' | 'majeur' | 'mineur';
  
  export interface ViolationRow {
    id: string;
    rule: string;
    priority: Priority;
    titre: string;
    pageUrl: string;
  }
  
  export const PRIORITY_DISPLAY: Record<Priority, { label: string; className: string }> = {
    bloquant: { label: 'Bloquant', className: 'bg-bloquant/10 text-bloquant border-bloquant/30' },
    majeur: { label: 'Majeur', className: 'bg-majeur/10 text-majeur border-majeur/30' },
    mineur: { label: 'Mineur', className: 'bg-mineur/10 text-mineur border-mineur/30' },
  };