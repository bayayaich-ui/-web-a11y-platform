import { Page } from 'playwright';

export async function extractInternalLinks(page: Page, baseUrl: string): Promise<string[]> {
  const baseHost = new URL(baseUrl).hostname;

  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.getAttribute('href')).filter(Boolean) as string[]
  );

  const internalLinks = new Set<string>();

  for (const href of hrefs) {
    try {
      const resolved = new URL(href, baseUrl);

      if (resolved.hostname === baseHost) {
        resolved.hash = '';
        internalLinks.add(resolved.toString());
      }
    } catch {
      // href invalide, ignoré silencieusement
    }
  }

  return Array.from(internalLinks);
}