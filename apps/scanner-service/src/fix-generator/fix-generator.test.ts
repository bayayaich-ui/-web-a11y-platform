import { describe, it, expect, vi } from 'vitest';
import { FixGenerator, FixParsingError } from './fix-generator';
import type { ViolationBrute } from './types';

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function (this: any) {
    this.getGenerativeModel = vi.fn().mockReturnValue({
      generateContent: vi.fn(),
    });
  }),
}));

describe('FixGenerator', () => {
  const violation: ViolationBrute = {
    rule: 'image-alt',
    html: '<img src="logo.png">',
    impact: 'critical',
    description: 'Images must have alternative text',
  };

  it('devrait parser un correctif JSON valide', async () => {
    const generator = new FixGenerator('fake-key');

    // @ts-expect-error - on remplace la fonction interne du mock
    generator.model.generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            correctif: {
              rule: 'image-alt',
              code_original: '<img src="logo.png">',
              code_corrige: '<img src="logo.png" alt="Logo">',
              explication: 'Ajoutez un attribut alt aux images.',
              type_correctif: 'automatique',
            },
          }),
      },
    });

    const result = await generator.genererCorrectif(violation);

    expect(result.rule).toBe('image-alt');
    expect(result.code_corrige).toContain('alt="Logo"');
    expect(result.type_correctif).toBe('automatique');
  });

  it('devrait nettoyer une réponse JSON entourée de balises markdown', async () => {
    const generator = new FixGenerator('fake-key');
    const mockResponse = '```json\n' +
      JSON.stringify({
        correctif: {
          rule: 'image-alt',
          code_original: '<img src="logo.png">',
          code_corrige: '<img src="logo.png" alt="Logo">',
          explication: 'Ajoutez un attribut alt aux images.',
          type_correctif: 'automatique',
        },
      }) +
      '\n```';

    // @ts-expect-error
    generator.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => mockResponse },
    });

    const result = await generator.genererCorrectif(violation);
    expect(result.code_corrige).toContain('alt="Logo"');
  });

  it('devrait rejeter un JSON non parsable', async () => {
    const generator = new FixGenerator('fake-key');

    // @ts-expect-error
    generator.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => 'Ceci n\'est pas du JSON' },
    });

    await expect(generator.genererCorrectif(violation)).rejects.toThrow('Échec de la génération du correctif');
  });

  it('devrait rejeter un schéma de réponse invalide', async () => {
    const generator = new FixGenerator('fake-key');

    // @ts-expect-error
    generator.model.generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({ correctif: { rule: 'image-alt' } }),
      },
    });

    await expect(generator.genererCorrectif(violation)).rejects.toThrow('Échec de la génération du correctif');
  });

  it('devrait rejeter une réponse vide', async () => {
    const generator = new FixGenerator('fake-key');

    // @ts-expect-error
    generator.model.generateContent = vi.fn().mockResolvedValue({
      response: { text: () => '' },
    });

    await expect(generator.genererCorrectif(violation)).rejects.toThrow('Échec de la génération du correctif');
  });
});
