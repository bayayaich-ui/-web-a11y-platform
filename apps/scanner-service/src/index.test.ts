import { describe, it, expect } from "vitest";
import { chromium } from "playwright";
import { promises as fs } from "fs";
import path from "path";

import { runAxeScan } from "./axe-runner/run";
import { parseAxeResults } from "./axe-runner/parser";


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

});
