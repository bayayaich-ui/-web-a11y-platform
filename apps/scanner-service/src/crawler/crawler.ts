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

function isHtmlMimeType(contentType: string | null | undefined): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes('text/html'));
}

export function shouldSkipUrl(url: string): boolean {
  const skipExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.7z',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.mp4', '.avi', '.mov',
  ];

  const lowerUrl = url.toLowerCase();
  if (skipExtensions.some((ext) => lowerUrl.includes(ext))) {
    return true;
  }

  // Only skip direct download/file patterns. A page like /index.php?url=contact
  // is a valid HTML page and should not be treated as a downloadable resource.
  if (/\b(?:download|file|attachment)=/i.test(url)) {
    return true;
  }

  return false;
}

export async function crawlSite(
  startUrl: string,
  pool: BrowserPoolManager,
  options: { maxDepth?: number; maxPages?: number; scanMode?: 'single_page' | 'full_site'; onProgress?: (discovered: number) => void | Promise<void>; onPageError?: (url: string, error: unknown) => void } = {}
): Promise<CrawlResult[]> {
  const queue = new UrlQueue(options.maxDepth ?? 3, options.maxPages ?? 50);
  const results: CrawlResult[] = [];

  const { page, context } = await pool.acquirePage();
  const scanMode = options.scanMode ?? 'single_page';
  const startHost = new URL(startUrl).hostname;
  let robots = { disallowedPaths: [] as string[], sitemapUrls: [] as string[] };

  try {
    if (scanMode === 'single_page') {
      console.log('Crawler: single_page mode — only the start URL will be scanned');
      queue.add(startUrl, 0);
    } else {
      robots = await readRobotsTxt(startUrl, page);
      const sitemapUrls = await readSitemap(startUrl, page, robots.sitemapUrls);
      console.log(`Crawler: robots rules disallowed=${robots.disallowedPaths.length} sitemapUrls=${sitemapUrls.length}`);
      const internalSitemapUrls = sitemapUrls.filter((url) => {
        try { return new URL(url).hostname === startHost && isPathAllowed(url, robots.disallowedPaths); }
        catch { return false; }
      });
      (internalSitemapUrls.length > 0 ? internalSitemapUrls : [startUrl]).forEach((url) => queue.add(url, 0));
    }
    await options.onProgress?.(queue.visitedCount);

    while (!queue.isEmpty) {
      const current = queue.next();
      if (!current) break;
      if (shouldSkipUrl(current.url)) continue;

      try {
        const response = await page.goto(current.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (!response || !isHtmlMimeType(response.headers()['content-type'])) continue;
        results.push({ url: current.url, title: await page.title(), depth: current.depth });
        if (scanMode !== 'single_page') {
          const links = await extractInternalLinks(page, startUrl);
          links.filter((link) => isPathAllowed(link, robots.disallowedPaths)).forEach((link) => queue.add(link, current.depth + 1));
          await options.onProgress?.(queue.visitedCount);
        }
      } catch (error) {
        console.warn(`Impossible de scanner ${current.url}:`, error);
        options.onPageError?.(current.url, error);
      }
    }
    return results;
  } finally {
    await pool.releasePage(context);
  }
}