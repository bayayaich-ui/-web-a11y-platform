import { describe, it, expect, vi } from "vitest";
import { chromium } from "playwright";
import { promises as fs } from "fs";
import path from "path";

import { runAxeScan } from "./axe-runner/run";
import { parseAxeResults } from "./axe-runner/parser";
import { processViolationsWithDiagnostics } from "./index";
import { shouldSkipUrl } from "./crawler/crawler";

describe("axe accessibility scanner", () => {

    it("should detect accessibility violations", async () => {

        const browser = await chromium.launch({
            headless: true
        });

        try {

            const context = await browser.newContext({
                bypassCSP: true
            });

            const page = await context.newPage();


            await page.goto("https://enis.ieee.tn/", {
                waitUntil: "domcontentloaded",
                timeout: 30000
            });


            const axeResults = await runAxeScan(page);


            const violations = parseAxeResults(
                axeResults.violations
            );

            const outputPath = path.resolve(process.cwd(), "reports/axe-results.json");
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, JSON.stringify(violations, null, 2), "utf8");

            console.log(`Résultats enregistrés dans ${outputPath}`);
            console.log(
                JSON.stringify(
                    violations,
                    null,
                    2
                )
            );

            expect(violations).toBeDefined();


        } finally {

            await browser.close();

        }

    }, 60000);

    it("conserve une localisation source si elle est déjà fournie par axe", async () => {
        const service = {
          genererDiagnostic: vi.fn().mockResolvedValue({
            diagnostic: {
              titre: 'Test',
              severite: 'Majeur',
              explication_simple: 'Explication',
              impact_utilisateur: 'Impact',
              recommandation: 'Recommandation',
              code_corrige: '<div></div>',
              ressources: [],
            },
          }),
        };

        const violations = [{
          rule: 'button-name',
          impact: 'serious',
          description: 'Le bouton n’a pas de nom accessible.',
          help: 'Aide',
          affectedElements: [{
            html: '<button class="submit">Login</button>',
            target: ['button.submit'],
            sourceFile: 'src/components/LoginForm.tsx',
            sourceLine: 48,
            sourceColumn: 5,
          }],
          wcag: [{ id: '4.1.2' }],
        }];

        const result = await processViolationsWithDiagnostics(violations as any, service as any);

        expect(result).toHaveLength(1);
        expect(result[0].violation.sourceFile).toBe('src/components/LoginForm.tsx');
        expect(result[0].violation.sourceLine).toBe(48);
        expect(result[0].violation.sourceColumn).toBe(5);
    });

    it("conserve les violations quand le diagnostic IA réussi", async () => {
        const service = {
          genererDiagnostic: vi.fn().mockResolvedValue({
            diagnostic: {
              titre: 'Test',
              severite: 'Majeur',
              explication_simple: 'Explication',
              impact_utilisateur: 'Impact',
              recommandation: 'Recommandation',
              code_corrige: '<div></div>',
              ressources: [],
            },
          }),
        };

        const violations = [
          { rule: 'color-contrast', impact: 'serious', description: 'Contraste', help: 'Aide', affectedElements: [{ html: '<button>OK</button>', target: ['button'] }], wcag: [{ id: '1.4.3' }] },
          { rule: 'image-alt', impact: 'moderate', description: 'Alt absent', help: 'Aide', affectedElements: [{ html: '<img>', target: ['img'] }], wcag: [{ id: '1.1.1' }] },
        ];

        const result = await processViolationsWithDiagnostics(violations as any, service as any);

        expect(result).toHaveLength(2);
        expect(result.every(item => item.violation)).toBe(true);
        expect(result.every(item => item.diagnostic && item.diagnostic.severite)).toBe(true);
        expect(service.genererDiagnostic).toHaveBeenCalledTimes(2);
    });

    it("conserve les violations quand le diagnostic IA échoue", async () => {
        const service = {
          genererDiagnostic: vi.fn()
            .mockResolvedValueOnce({
              diagnostic: {
                titre: 'OK',
                severite: 'Mineur',
                explication_simple: 'ok',
                impact_utilisateur: 'ok',
                recommandation: 'ok',
                code_corrige: '<div></div>',
                ressources: [],
              },
            })
            .mockRejectedValueOnce(new Error('LLM unavailable'))
            .mockResolvedValueOnce({
              diagnostic: {
                titre: 'OK 2',
                severite: 'Info',
                explication_simple: 'ok',
                impact_utilisateur: 'ok',
                recommandation: 'ok',
                code_corrige: '<div></div>',
                ressources: [],
              },
            }),
        };

        const violations = [
          { rule: 'color-contrast', impact: 'serious', description: 'Contraste', help: 'Aide', affectedElements: [{ html: '<button>OK</button>', target: ['button'] }], wcag: [{ id: '1.4.3' }] },
          { rule: 'image-alt', impact: 'moderate', description: 'Alt absent', help: 'Aide', affectedElements: [{ html: '<img>', target: ['img'] }], wcag: [{ id: '1.1.1' }] },
          { rule: 'label', impact: 'minor', description: 'Label absent', help: 'Aide', affectedElements: [{ html: '<input>', target: ['input'] }], wcag: [{ id: '3.3.2' }] },
        ];

        const result = await processViolationsWithDiagnostics(violations as any, service as any);

        expect(result).toHaveLength(3);
        expect(result.filter(item => item.diagnostic?.severite === 'Info').length).toBeGreaterThan(0);
        expect(result.every(item => item.violation)).toBe(true);
    });

    it("conserve un scan vide quand aucune violation n'est détectée", async () => {
        const service = {
          genererDiagnostic: vi.fn(),
        };

        const result = await processViolationsWithDiagnostics([], service as any);

        expect(result).toEqual([]);
        expect(service.genererDiagnostic).not.toHaveBeenCalled();
    });

    it("n'ignore pas les pages HTML avec paramètre url dans la query string", () => {
        expect(shouldSkipUrl("https://enis.ieee.tn/index.php?url=contact")).toBe(false);
        expect(shouldSkipUrl("https://example.com/page?lang=fr")).toBe(false);
        expect(shouldSkipUrl("https://example.com/download?file=report.pdf")).toBe(true);
    });

    it("garde les violations sans échouer si le service IA est indisponible", async () => {
        const violations = [
          { rule: 'color-contrast', impact: 'serious', description: 'Contraste', help: 'Aide', affectedElements: [{ html: '<button>OK</button>', target: ['button'] }], wcag: [{ id: '1.4.3' }] },
        ];

        const result = await processViolationsWithDiagnostics(violations as any, null as any);

        expect(result).toHaveLength(1);
        expect(result[0].diagnostic.titre).toBe('Diagnostic IA indisponible');
    });
});
