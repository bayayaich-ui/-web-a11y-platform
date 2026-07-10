import { Page } from "playwright";
import { injectAxe } from "./inject";

export async function runAxeScan(page: Page) {

    await injectAxe(page);

    const results = await page.evaluate(async () => {
        return await axe.run();
    });

    return results;
}

