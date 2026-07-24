import { describe, it, expect } from 'vitest';
import { calculerPriorite, prioriserViolations } from './prioritization';
import { Diagnostic, ViolationBrute } from './types';

function makeDiagnostic(severite: Diagnostic['severite']): Diagnostic {
  return {
    titre: 'Test',
    severite,
    explication_simple: 'Test',
    impact_utilisateur: 'Test',
    recommandation: 'Test',
    code_corrige: 'Test',
    ressources: [],
  };
}

function makeViolation(impact: ViolationBrute['impact']): ViolationBrute {
  return {
    rule: 'test-rule',
    impact,
    element: '<div></div>',
    message: 'Test',
    wcag: ['1.1.1'],
    help: 'Test',
  };
}

describe('calculerPriorite', () => {
  it('devrait retourner "bloquant" si axe-core dit critical', () => {
    const result = calculerPriorite(makeViolation('critical'), makeDiagnostic('Mineur'));
    expect(result).toBe('bloquant');
  });

  it('devrait retourner "bloquant" si le LLM dit Critique, même si axe-core dit minor', () => {
    const result = calculerPriorite(makeViolation('minor'), makeDiagnostic('Critique'));
    expect(result).toBe('bloquant');
  });

  it('devrait retourner "majeur" quand les deux sources concordent', () => {
    const result = calculerPriorite(makeViolation('serious'), makeDiagnostic('Majeur'));
    expect(result).toBe('majeur');
  });

  it('devrait retourner "mineur" pour un impact modéré et une sévérité Info', () => {
    const result = calculerPriorite(makeViolation('moderate'), makeDiagnostic('Info'));
    expect(result).toBe('mineur');
  });
});

describe('prioriserViolations', () => {
  it('devrait trier les violations du plus urgent au moins urgent', () => {
    const items = [
      { violation: makeViolation('minor'), diagnostic: makeDiagnostic('Mineur') },
      { violation: makeViolation('critical'), diagnostic: makeDiagnostic('Critique') },
      { violation: makeViolation('serious'), diagnostic: makeDiagnostic('Majeur') },
    ];

    const result = prioriserViolations(items);

    expect(result[0].priority).toBe('bloquant');
    expect(result[1].priority).toBe('majeur');
    expect(result[2].priority).toBe('mineur');
  });

  it('ne devrait pas planter sur un tableau vide', () => {
    expect(prioriserViolations([])).toEqual([]);
  });
});
