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

function shouldSkipUrl(url: string): boolean {
  const skipExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.7z',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.mp4', '.avi', '.mov',
  ];

  const lowerUrl = url.toLowerCase();
  if (skipExtensions.some((ext) => lowerUrl.includes(ext))) {
    return true;
  }

  if (/\b(url|download|file|attachment)=/i.test(url)) {
    return true;
  }

  return false;
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
    ? robots.sitemapUrls
    : await readSitemap(startUrl, page);

  console.log(`Crawler: robots rules disallowed=${robots.disallowedPaths.length} sitemapUrls=${sitemapUrls.length}`);

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

    if (shouldSkipUrl(current.url)) {
      console.warn(`URL ignorée par le crawler (ressource non-HTML ou téléchargement probable) : ${current.url}`);
      continue;
    }

    try {
      const response = await page.goto(current.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response) {
        console.warn(`Aucune réponse reçue pour ${current.url}, page ignorée.`);
        continue;
      }

      const contentType = response.headers()['content-type'];
      if (!isHtmlMimeType(contentType)) {
        console.warn(`Contenu non HTML détecté pour ${current.url} (${contentType}), page ignorée.`);
        continue;
      }

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