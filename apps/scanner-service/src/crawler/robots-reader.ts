import { Page } from 'playwright';

export interface RobotsRules {
  disallowedPaths: string[];
  sitemapUrls: string[];
}

export async function readRobotsTxt(baseUrl: string, page: Page): Promise<RobotsRules> {
  const robotsUrl = new URL('/robots.txt', baseUrl).toString();
  const rules: RobotsRules = { disallowedPaths: [], sitemapUrls: [] };

  try {
    const response = await page.goto(robotsUrl, {
      timeout: 20000,
      waitUntil: 'domcontentloaded',
    });

    if (!response || response.status() !== 200) {
      return rules; // Pas de robots.txt : aucune restriction connue
    }

    const content = await page.content();
    // Playwright encapsule le texte brut dans un <pre>, on l'extrait
    const textMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    const text = textMatch ? textMatch[1] : content;

    const lines = text.split('\n').map(l => l.trim());
    let appliesToAllAgents = false;

    for (const line of lines) {
      if (/^user-agent:\s*\*/i.test(line)) {
        appliesToAllAgents = true;
      } else if (/^user-agent:/i.test(line)) {
        appliesToAllAgents = false;
      } else if (appliesToAllAgents && /^disallow:/i.test(line)) {
        const path = line.split(':')[1]?.trim();
        if (path) rules.disallowedPaths.push(path);
      } else if (/^sitemap:/i.test(line)) {
        const sitemapUrl = line.substring(line.indexOf(':') + 1).trim();
        rules.sitemapUrls.push(sitemapUrl);
      }
    }

    return rules;
  } catch (error) {
    console.warn(`robots-reader: impossible de lire ${robotsUrl} :`, error);
    return rules;
  }
}

export function isPathAllowed(url: string, disallowedPaths: string[]): boolean {
  const path = new URL(url).pathname;
  return !disallowedPaths.some(disallowed => path.startsWith(disallowed));
}