import { BrowserPoolManager } from '../src/browser-pool/pool-manager';
import { crawlSite } from '../src/crawler/crawler';

(async () => {
  const pool = new BrowserPoolManager(2);
  await pool.initialize();
  try {
    console.log('Start crawl');
    const pages = await crawlSite('https://enis.ieee.tn/', pool, { maxDepth: 2, maxPages: 10 });
    console.log('Finished crawl', pages.length);
    console.log(pages);
  } catch (err) {
    console.error('Crawl error', err);
  } finally {
    await pool.shutdown();
  }
})();
