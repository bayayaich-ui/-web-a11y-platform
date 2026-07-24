import { ViolationBrute, Diagnostic } from './types';

export type Priority = 'bloquant' | 'majeur' | 'mineur';

// Table de correspondance : impact technique axe-core -> priorité métier
const AXE_IMPACT_TO_PRIORITY: Record<string, Priority> = {
  critical: 'bloquant',
  serious: 'majeur',
  moderate: 'mineur',
  minor: 'mineur',
};

// Table de correspondance : sévérité jugée par le LLM -> priorité métier
const LLM_SEVERITE_TO_PRIORITY: Record<Diagnostic['severite'], Priority> = {
  Critique: 'bloquant',
  Majeur: 'majeur',
  Mineur: 'mineur',
  Info: 'mineur',
};

// Ordre numérique pour trier (0 = le plus urgent)
const PRIORITY_ORDER: Record<Priority, number> = {
  bloquant: 0,
  majeur: 1,
  mineur: 2,
};

/**
 * Retourne la priorité la plus sévère entre deux valeurs.
 * Utilisé pour ne jamais sous-estimer un problème : si l'une des deux
 * sources (axe-core ou LLM) juge un problème plus grave, on garde ce jugement.
 */
function priorityMax(a: Priority, b: Priority): Priority {
  return PRIORITY_ORDER[a] <= PRIORITY_ORDER[b] ? a : b;
}

export function calculerPriorite(
  violation: Pick<ViolationBrute, 'impact'>,
  diagnostic: Pick<Diagnostic, 'severite'>
): Priority {
  const prioriteAxe = AXE_IMPACT_TO_PRIORITY[violation.impact] ?? 'mineur';
  const prioriteLLM = LLM_SEVERITE_TO_PRIORITY[diagnostic.severite] ?? 'mineur';
  return priorityMax(prioriteAxe, prioriteLLM);
}

export { PRIORITY_ORDER };
export interface ViolationAvecDiagnostic {
    violation: ViolationBrute;
    diagnostic: Diagnostic;
  }
  
  export interface ViolationPrioritisee extends ViolationAvecDiagnostic {
    priority: Priority;
  }
  
  /**
   * Calcule la priorité de chaque violation et trie le tableau
   * du problème le plus urgent (bloquant) au moins urgent (mineur).
   */
  export function prioriserViolations(
    items: ViolationAvecDiagnostic[]
  ): ViolationPrioritisee[] {
    return items
      .map((item) => ({
        ...item,
        priority: calculerPriorite(item.violation, item.diagnostic),
      }))
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }