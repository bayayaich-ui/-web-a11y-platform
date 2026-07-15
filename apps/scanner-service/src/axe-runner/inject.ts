import { Page } from "playwright";
import axe from "axe-core";

export async function injectAxe(page: Page) {
    await page.evaluate((source) => {
        const script = document.createElement("script");
        script.textContent = source;
        document.head.appendChild(script);
    }, axe.source);
}



