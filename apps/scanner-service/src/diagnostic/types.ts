export interface ViolationBrute {
  rule: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string;
  message: string;
  wcag: string[];
  help: string;
}

export interface Diagnostic {
  titre: string;
  severite: 'Critique' | 'Majeur' | 'Mineur' | 'Info';
  explication_simple: string;
  impact_utilisateur: string;
  recommandation: string;
  code_corrige: string;
  ressources: string[];
}

export interface DiagnosticResponse {
  diagnostic: Diagnostic;
}