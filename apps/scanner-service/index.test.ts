import { describe, it, expect } from "vitest";
import { chromium } from "playwright";
import { runAxeScan } from "./src/axe-runner/run";
import { parseAxeResults } from "./src/axe-runner/parser";


describe("axe accessibility scanner", () => {

    it("should detect accessibility violations", async () => {


        const browser = await chromium.launch({
            headless: true
        });


        const page = await browser.newPage();


        await page.goto("https://example.com");


        const results = await runAxeScan(page);


        const parsedResults = parseAxeResults(results);


        console.log(parsedResults);


        expect(results).toHaveProperty("violations");


        await browser.close();

    }, 30000);

});
