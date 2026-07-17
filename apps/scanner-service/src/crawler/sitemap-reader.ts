import { Page } from 'playwright';

export async function readSitemap(baseUrl: string, page: Page): Promise<string[]> {
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();

  try {
    const response = await page.goto(sitemapUrl, { timeout: 5000 });

    if (!response || response.status() !== 200) {
      return []; // Pas de sitemap, ce n'est pas une erreur bloquante
    }

    const content = await page.content();
    const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];

    return urlMatches.map(match =>
      match.replace('<loc>', '').replace('</loc>', '').trim()
    );
  } catch {
    return []; // Timeout ou site sans sitemap : on continue sans bloquer
  }
}