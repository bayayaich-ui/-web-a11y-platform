import 'dotenv/config';
import { connectQueue, closeQueue } from './queue-consumer/rabbitmq-connection';
import { startConsuming, ScanJob } from './queue-consumer/job-handler';
import { publishPageResult } from './queue-consumer/result-publisher';
import { BrowserPoolManager } from './browser-pool/pool-manager';
import { crawlSite } from './crawler/crawler';
import { captureAndStoreScreenshot } from './screenshot/screenshot-service';
import { runAxeScan } from './axe-runner/run';
import { parseAxeResults } from './axe-runner/parser';
import { DiagnosticService } from './diagnostic/diagnostic-service';
import { prioriserViolations, ViolationAvecDiagnostic } from './diagnostic/prioritization';
import { ViolationBrute } from './diagnostic/types';

const diagnosticService = new DiagnosticService(process.env.GEMINI_API_KEY!);

// Transforme le format retourné par axe-runner/parser en format attendu par le diagnostic IA
function toViolationBrute(axeViolation: any): ViolationBrute {
  const premierElement = axeViolation.affectedElements?.[0];
  return {
    rule: axeViolation.rule,
    impact: axeViolation.impact,
    element: premierElement?.html ?? '',
    message: axeViolation.description ?? axeViolation.help,
    wcag: (axeViolation.wcag ?? []).map((w: any) => w.id),
    help: axeViolation.help,
  };
}

async function processScanJob(job: ScanJob, pool: BrowserPoolManager, channel: any) {
  console.log(`Démarrage du scan ${job.scan_id} pour ${job.url}`);

  const pages = await crawlSite(job.url, pool, {
    maxDepth: job.max_depth,
    maxPages: job.max_pages,
  });

  for (const crawledPage of pages) {
    const { page, context } = await pool.acquirePage();
    await page.goto(crawledPage.url);

    // 1. Détection des violations avec axe-core
    const axeResults = await runAxeScan(page);
    const violationsBrutes = parseAxeResults(axeResults.violations);

    // 2. Diagnostic IA (une fois par règle détectée sur la page, pas par élément affecté,
    //    pour économiser le quota gratuit de l'API)
    const violationsAvecDiagnostic: ViolationAvecDiagnostic[] = [];
    for (const axeViolation of violationsBrutes) {
      const violationBrute = toViolationBrute(axeViolation);
      try {
        const { diagnostic } = await diagnosticService.genererDiagnostic(violationBrute);
        violationsAvecDiagnostic.push({ violation: violationBrute, diagnostic });
      } catch (error) {
        console.error(`Diagnostic IA échoué pour la règle ${violationBrute.rule}:`, error);
        // On continue le scan même si UNE violation échoue, plutôt que de tout bloquer
      }
    }

    // 3. Calcul de la priorité (croisement axe-core + LLM) et tri
    const violationsTriees = prioriserViolations(violationsAvecDiagnostic);

    // 4. Capture et upload du screenshot
    const screenshotResult = await captureAndStoreScreenshot(page, job.scan_id, crawledPage.url);

    // 5. Publication du résultat complet vers RabbitMQ, déjà trié
    publishPageResult(channel, {
      scan_id: job.scan_id,
      page_url: crawledPage.url,
      violations: violationsTriees,
      screenshot_key: screenshotResult.screenshotKey,
      scanned_at: screenshotResult.capturedAt,
    });

    console.log(`Page ${crawledPage.url} : ${violationsTriees.length} violations diagnostiquées`);

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