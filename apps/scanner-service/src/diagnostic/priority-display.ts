import { Priority } from './prioritization';

export interface PriorityDisplay {
  label: string;
  color: string;
  order: number;
}

export const PRIORITY_DISPLAY: Record<Priority, PriorityDisplay> = {
  bloquant: { label: 'Bloquant', color: '#dc2626', order: 0 },
  majeur: { label: 'Majeur', color: '#f59e0b', order: 1 },
  mineur: { label: 'Mineur', color: '#6b7280', order: 2 },
};