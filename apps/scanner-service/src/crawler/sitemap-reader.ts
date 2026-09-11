import { Page } from 'playwright';

export async function readSitemap(baseUrl: string, page: Page, sitemapUrls?: string[]): Promise<string[]> {
  const sitemapDocuments = sitemapUrls?.length
    ? sitemapUrls.map((url) => new URL(url, baseUrl).toString())
    : [new URL('/sitemap.xml', baseUrl).toString()];
  const visited = new Set<string>();

  async function readSitemapDocument(url: string): Promise<string[]> {
    if (visited.has(url)) return [];
    visited.add(url);

    try {
      const response = await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });

      if (!response || response.status() !== 200) return [];

      const content = await response.text();
      const locs = [...content.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gis)].map((match) => match[1].trim());
      if (/<sitemapindex\b/i.test(content)) {
        const nested = await Promise.all(locs.map((nestedUrl) => readSitemapDocument(new URL(nestedUrl, url).toString())));
        return nested.flat();
      }
      return locs;
    } catch {
      return [];
    }
  }

  const results = await Promise.all(sitemapDocuments.map((url) => readSitemapDocument(url)));
  return results.flat();
}