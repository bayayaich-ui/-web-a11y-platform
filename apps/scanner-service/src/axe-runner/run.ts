import { Page } from "playwright";
import { injectAxe } from "./inject";


export async function runAxeScan(page: Page) {
  await injectAxe(page);

  const results = await page.evaluate(async () => {
    // axe est injecté dynamiquement dans la page par injectAxe()
    return await (window as any).axe.run();
  });

  return results;
}

