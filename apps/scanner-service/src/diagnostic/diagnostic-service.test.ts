import { describe, it, expect, vi } from 'vitest';
import { DiagnosticService } from './diagnostic-service';

vi.mock('@google/generative-ai', () => {
    return {
      GoogleGenerativeAI: vi.fn().mockImplementation(function (this: any) {
        this.getGenerativeModel = vi.fn().mockReturnValue({
          generateContent: vi.fn(),
        });
      }),
    };
  });

describe('DiagnosticService - parsing des réponses', () => {
  const violation = {
    rule: "aria-required-attr",
    impact: "critical" as const,
    element: '<input type="text" id="email">',
    message: "Required ARIA attributes not present: aria-label",
    wcag: ["4.1.2"],
    help: "Ensures elements with ARIA roles have all required ARIA attributes",
  };

  const diagnosticValide = {
    diagnostic: {
      titre: "Champ de formulaire sans étiquette accessible",
      severite: "Critique" as const,
      explication_simple: "Le champ 'email' n'a pas de label visible.",
      impact_utilisateur: "Les personnes malvoyantes ne peuvent pas comprendre ce champ.",
      recommandation: "Ajoutez un <label> ou un aria-label.",
      code_corrige: '<label for="email">Adresse email</label>',
      ressources: ["https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html"],
    },
  };

  it('devrait parser une réponse JSON valide et propre', async () => {
    const service = new DiagnosticService('fake-key');

    // @ts-expect-error - accès à la propriété privée pour le test
    service.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => JSON.stringify(diagnosticValide) },
    });

    const result = await service.genererDiagnostic(violation);

    expect(result.diagnostic.severite).toBe('Critique');
    expect(result.diagnostic.titre).toContain('étiquette');
  });

  it('devrait nettoyer une réponse entourée de balises markdown', async () => {
    const service = new DiagnosticService('fake-key');
    const mockResponse = '```json\n' + JSON.stringify(diagnosticValide) + '\n```';

    // @ts-expect-error
    service.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => mockResponse },
    });

    const result = await service.genererDiagnostic(violation);
    expect(result.diagnostic.severite).toBe('Critique');
  });

  it('devrait rejeter une réponse avec une severite invalide', async () => {
    const service = new DiagnosticService('fake-key');
    const invalide = {
      diagnostic: { ...diagnosticValide.diagnostic, severite: "Urgent" },
    };

    // @ts-expect-error
    service.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => JSON.stringify(invalide) },
    });

    await expect(service.genererDiagnostic(violation)).rejects.toThrow();
  });

  it('devrait rejeter un JSON incomplet (champ manquant)', async () => {
    const service = new DiagnosticService('fake-key');
    const incomplet = {
      diagnostic: {
        titre: "Titre seul",
        // les autres champs obligatoires manquent
      },
    };

    // @ts-expect-error
    service.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => JSON.stringify(incomplet) },
    });

    await expect(service.genererDiagnostic(violation)).rejects.toThrow();
  });

  it('devrait rejeter du texte qui n\'est pas du JSON', async () => {
    const service = new DiagnosticService('fake-key');

    // @ts-expect-error
    service.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => "Voici mon analyse en texte libre, pas de JSON ici." },
    });

    await expect(service.genererDiagnostic(violation)).rejects.toThrow();
  });
});