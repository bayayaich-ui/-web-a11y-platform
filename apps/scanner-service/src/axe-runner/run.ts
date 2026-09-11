import { Page } from "playwright";
import { injectAxe } from "./inject";

export function findHtmlLocation(html: string, snippet: string, fromIndex = 0) {
  const index = html.indexOf(snippet, fromIndex);
  if (index < 0) return null;

  const line = html.slice(0, index).split("\n").length;
  const lastNewline = html.lastIndexOf("\n", index - 1);
  return { index, line, column: index - lastNewline };
}

function addRenderedSourceLocations(results: any, sourceFile: string, html: string) {
  let searchFrom = 0;

  for (const violation of results?.violations ?? []) {
    for (const node of violation.nodes ?? []) {
      if (node.source?.file || node.sourceFile || node.file) continue;
      const location = findHtmlLocation(html, node.html ?? "", searchFrom);
      if (!location) continue;

      node.sourceFile = sourceFile;
      node.sourceLine = location.line;
      node.sourceColumn = location.column;
      searchFrom = location.index + String(node.html).length;
    }
  }

  return results;
}

export async function runAxeScan(page: Page) {
  await injectAxe(page);

  const results = await page.evaluate(async () => {
    // axe est injecté dynamiquement dans la page par injectAxe()
    return await (window as any).axe.run();
  });

  return addRenderedSourceLocations(results, page.url(), await page.content());
}

