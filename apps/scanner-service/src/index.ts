import 'dotenv/config';
import { connectQueue, closeQueue } from './queue-consumer/rabbitmq-connection';
import { startConsuming, ScanJob } from './queue-consumer/job-handler';
import { publishPageResult } from './queue-consumer/result-publisher';
import { BrowserPoolManager } from './browser-pool/pool-manager';
import { crawlSite } from './crawler/crawler';
import { captureAndStoreScreenshot } from './screenshot/screenshot-service';

async function processScanJob(job: ScanJob, pool: BrowserPoolManager, channel: any) {
  console.log(`Démarrage du scan ${job.scan_id} pour ${job.url}`);

  const pages = await crawlSite(job.url, pool, {
    maxDepth: job.max_depth,
    maxPages: job.max_pages,
  });

  for (const crawledPage of pages) {
    const { page, context } = await pool.acquirePage();
    await page.goto(crawledPage.url);

    const screenshotResult = await captureAndStoreScreenshot(page, job.scan_id, crawledPage.url);

    publishPageResult(channel, {
      scan_id: job.scan_id,
      page_url: crawledPage.url,
      violations: [], // sera rempli une fois axe-runner branché ici
      screenshot_key: screenshotResult.screenshotKey,
      scanned_at: screenshotResult.capturedAt,
    });

    await pool.releasePage(context);
  }

  console.log(`Scan ${job.scan_id} terminé : ${pages.length} pages traitées`);
}

async function main() {
  const pool = new BrowserPoolManager(3);
  await pool.initialize();

  const channel = await connectQueue();

  await startConsuming(channel, (job) => processScanJob(job, pool, channel));

  console.log('Scanner en écoute sur la file scan.jobs...');
}

main().catch((error) => {
  console.error('Erreur fatale au démarrage:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await closeQueue();
  process.exit(0);
});