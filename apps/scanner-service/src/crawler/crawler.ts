import { BrowserPoolManager } from '../browser-pool/pool-manager';
import { readSitemap } from './sitemap-reader';
import { readRobotsTxt, isPathAllowed } from './robots-reader';
import { extractInternalLinks } from './link-extractor';
import { UrlQueue } from './url-queue';

export interface CrawlResult {
  url: string;
  title: string;
  depth: number;
}

export async function crawlSite(
  startUrl: string,
  pool: BrowserPoolManager,
  options: { maxDepth?: number; maxPages?: number } = {}
): Promise<CrawlResult[]> {
  const queue = new UrlQueue(options.maxDepth ?? 3, options.maxPages ?? 50);
  const results: CrawlResult[] = [];

  const { page, context } = await pool.acquirePage();

  // 1. Lire robots.txt en premier pour connaître les restrictions
  const robots = await readRobotsTxt(startUrl, page);

  // 2. Essayer le sitemap (celui déclaré dans robots.txt, sinon l'emplacement standard)
  const sitemapUrls = robots.sitemapUrls.length > 0
    ? robots.sitemapUrls.flatMap(() => [] as string[]) // à étendre si plusieurs sitemaps
    : await readSitemap(startUrl, page);

  if (sitemapUrls.length > 0) {
    sitemapUrls
      .filter(url => isPathAllowed(url, robots.disallowedPaths))
      .forEach((url) => queue.add(url, 0));
  } else {
    queue.add(startUrl, 0);
  }

  // 3. Parcourir la file, en respectant robots.txt à chaque nouveau lien trouvé
  while (!queue.isEmpty) {
    const current = queue.next();
    if (!current) break;

    try {
      await page.goto(current.url, { waitUntil: 'networkidle', timeout: 10000 });
      const title = await page.title();

      results.push({ url: current.url, title, depth: current.depth });

      const links = await extractInternalLinks(page, startUrl);
      links
        .filter(link => isPathAllowed(link, robots.disallowedPaths))
        .forEach((link) => queue.add(link, current.depth + 1));
    } catch (error) {
      console.warn(`Impossible de scanner ${current.url}:`, error);
    }
  }

  await pool.releasePage(context);
  return results;
}