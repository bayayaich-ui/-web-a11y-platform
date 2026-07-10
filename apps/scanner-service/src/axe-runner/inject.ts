import { Page } from "playwright";
import axe from "axe-core";

export async function injectAxe(page: Page) {
    await page.addScriptTag({
        content: axe.source
    });
}



