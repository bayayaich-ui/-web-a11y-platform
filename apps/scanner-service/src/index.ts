import './load-env';
import { connectQueue, closeQueue } from './queue-consumer/rabbitmq-connection';
import { startConsuming, ScanJob } from './queue-consumer/job-handler';
import { publishPageResult, publishScanCompleted, publishScanFailed, publishScanProgress } from './queue-consumer/result-publisher';
import { BrowserPoolManager } from './browser-pool/pool-manager';
import { crawlSite } from './crawler/crawler';
import { captureAndStoreScreenshot } from './screenshot/screenshot-service';
import { runAxeScan } from './axe-runner/run';
import { parseAxeResults } from './axe-runner/parser';
import { DiagnosticService } from './diagnostic/diagnostic-service';
import { prioriserViolations, ViolationAvecDiagnostic } from './diagnostic/prioritization';
import { ViolationBrute } from './diagnostic/types';

const diagnosticService = process.env.GEMINI_API_KEY?.trim()
  ? new DiagnosticService(process.env.GEMINI_API_KEY)
  : null;
const SCAN_TIMEOUT_MS = Number(process.env.SCAN_TIMEOUT_MS ?? 300000);
const PAGE_TIMEOUT_MS = Number(process.env.PAGE_TIMEOUT_MS ?? 120000);
const DIAGNOSTIC_TIMEOUT_MS = Number(process.env.DIAGNOSTIC_TIMEOUT_MS ?? 30000);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

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
    sourceFile: premierElement?.sourceFile ?? null,
    sourceLine: premierElement?.sourceLine ?? null,
    sourceColumn: premierElement?.sourceColumn ?? null,
  };
}

export async function processViolationsWithDiagnostics(
  violationsBrutes: ReturnType<typeof parseAxeResults>,
  service: Pick<DiagnosticService, 'genererDiagnostic'> | null | undefined,
  logger: Pick<typeof console, 'log' | 'warn' | 'error'> = console,
): Promise<ViolationAvecDiagnostic[]> {
  const violationsAvecDiagnostic: ViolationAvecDiagnostic[] = [];
  let diagnosticsReussis = 0;
  let diagnosticsEchoues = 0;

  logger.log(`[SCAN] Violations Axe détectées: ${violationsBrutes.length}`);

  for (const axeViolation of violationsBrutes) {
    const violationBrute = toViolationBrute(axeViolation);
    const violationItem: ViolationAvecDiagnostic = {
      violation: violationBrute,
      diagnostic: {
        titre: 'Diagnostic IA indisponible',
        severite: 'Info',
        explication_simple: 'Le diagnostic IA n\'a pas pu être généré pour cette violation.',
        impact_utilisateur: 'Le diagnostic détaillé n\'est pas disponible pour cette violation.',
        recommandation: 'Réessayez le diagnostic d\'accessibilité plus tard ou vérifiez la violation brute.',
        code_corrige: '',
        ressources: [],
      },
    };

    logger.log(`[VIOLATION] Traitement de la violation: ${violationBrute.rule}`);
    if (!service) {
      logger.warn('[AI] Diagnostic IA indisponible: service non configuré');
      diagnosticsEchoues += 1;
      violationsAvecDiagnostic.push(violationItem);
      logger.log('[VIOLATION] Violation conservée');
      continue;
    }

    logger.log('[AI] Génération du diagnostic...');

    try {
      const { diagnostic } = await withTimeout(
        service.genererDiagnostic(violationBrute),
        DIAGNOSTIC_TIMEOUT_MS,
        `AI diagnostic for ${violationBrute.rule}`,
      );
      violationItem.diagnostic = diagnostic;
      diagnosticsReussis += 1;
      logger.log('[AI] Diagnostic réussi');
    } catch (error) {
      diagnosticsEchoues += 1;
      logger.error(`[AI] Échec du diagnostic IA pour ${violationBrute.rule}:`, error);
      logger.warn('[AI] Violation conservée malgré l\'échec du diagnostic');
    }

    violationsAvecDiagnostic.push(violationItem);
    logger.log('[VIOLATION] Violation conservée');
  }

  logger.log(`[SCAN] Violations Axe: ${violationsBrutes.length}`);
  logger.log(`[SCAN] Violations finales: ${violationsAvecDiagnostic.length}`);
  logger.log(`[SCAN] Diagnostics IA réussis: ${diagnosticsReussis}`);
  logger.log(`[SCAN] Diagnostics IA échoués: ${diagnosticsEchoues}`);

  return violationsAvecDiagnostic;
}

async function processPage(
  crawledPage: { url: string; title: string; depth: number },
  job: ScanJob,
  pool: BrowserPoolManager,
  channel: any
): Promise<boolean> {
  const { page, context } = await pool.acquirePage();
  try {
    await publishScanProgress(channel, { scan_id: job.scan_id, progress: 20, current_step: 'navigation' });
    const navigationStartedAt = Date.now();
    console.log(`[SCAN ${job.scan_id}] page:navigate url=${crawledPage.url}`);
    await page.goto(crawledPage.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[SCAN ${job.scan_id}] page:loaded duration_ms=${Date.now() - navigationStartedAt}`);

    // 1. Détection des violations avec axe-core
    console.log(`[SCAN ${job.scan_id}] axe:start`);
    await publishScanProgress(channel, { scan_id: job.scan_id, progress: 40, current_step: 'axe_analysis' });
    const axeResults = await runAxeScan(page);
    console.log(`[SCAN ${job.scan_id}] axe:end`);
    const violationsBrutes = parseAxeResults(axeResults?.violations ?? []);

    if (!Array.isArray(axeResults?.violations)) {
      throw new Error(`Axe n'a renvoyé aucun résultat exploitable pour ${crawledPage.url}`);
    }

    console.log(`[SCAN] URL: ${crawledPage.url}`);
    console.log(`[SCAN] Page loaded`);
    console.log(`[SCAN] Scanner started`);
    console.log(`[SCAN] Raw violations detected: ${axeResults.violations.length}`);
    console.log(`[SCAN] Parsed violations: ${violationsBrutes.length}`);

    // 2. Diagnostic IA séparé de la détection des violations : on conserve la violation
    //    même si le LLM échoue.
    const violationsAvecDiagnostic = await processViolationsWithDiagnostics(
      violationsBrutes,
      diagnosticService,
      console,
    );
    await publishScanProgress(channel, { scan_id: job.scan_id, progress: 70, current_step: 'diagnostics' });

    // 3. Calcul de la priorité (croisement axe-core + LLM) et tri
    const violationsTriees = prioriserViolations(violationsAvecDiagnostic);
    console.log(`[SCAN] Final violations: ${violationsTriees.length}`);

    // 4. Capture et upload du screenshot
    const screenshotResult = await captureAndStoreScreenshot(page, job.scan_id, crawledPage.url);

    // 5. Publication du résultat complet vers RabbitMQ, déjà trié
    await publishScanProgress(channel, { scan_id: job.scan_id, progress: 95, current_step: 'persisting_results' });
    publishPageResult(channel, {
      scan_id: job.scan_id,
      page_url: crawledPage.url,
      violations: violationsTriees,
      screenshot_key: screenshotResult.screenshotKey,
      scanned_at: screenshotResult.capturedAt,
    });

    console.log(`Page ${crawledPage.url} : ${violationsTriees.length} violations diagnostiquées`);
    return true;
  } catch (error) {
    console.error(`[SCAN ${job.scan_id}] FAILED step=page url=${crawledPage.url}:`, error);
    return false;
  } finally {
    await pool.releasePage(context);
  }
}

async function processScanJob(job: ScanJob, pool: BrowserPoolManager, channel: any) {
  const startedAt = Date.now();
  console.log(`[SCAN ${job.scan_id}] START url=${job.url}`);
  let crawlFailedPages = 0;

  const crawl = crawlSite(job.url, pool, {
    maxDepth: job.max_depth,
    maxPages: job.max_pages,
    scanMode: job.scan_mode ?? 'single_page',
    onProgress: (discovered) => {
      return publishScanProgress(channel, { scan_id: job.scan_id, progress: Math.min(10, discovered > 0 ? 5 : 0), current_step: 'crawling' });
    },
    onPageError: (url, error) => {
      crawlFailedPages += 1;
      console.error(`[SCAN ${job.scan_id}] CRAWL_PAGE_FAILED url=${url}:`, error);
    },
  });
  const pages = await withTimeout(crawl, SCAN_TIMEOUT_MS, 'crawl');
  console.log(`[SCAN ${job.scan_id}] crawl:end pages=${pages.length} duration_ms=${Date.now() - startedAt}`);
  if (pages.length === 0) throw new Error('Aucune page HTML accessible à scanner');

  const concurrency = pool.concurrency;
  const tasks: Promise<boolean>[] = [];
  let failedPages = crawlFailedPages;
  let completedPages = 0;

  for (const crawledPage of pages) {
    const task = withTimeout(
      processPage(crawledPage, job, pool, channel),
      PAGE_TIMEOUT_MS,
      `page ${crawledPage.url}`,
    ).catch((error) => {
      console.error(`[SCAN ${job.scan_id}] page timeout/error url=${crawledPage.url}:`, error);
      return false;
    });
    tasks.push(task);

    if (tasks.length >= concurrency) {
      const results = await Promise.allSettled(tasks);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Erreur de page parallèle :', result.reason);
        }
      });
      failedPages += results.filter((result) => result.status === 'fulfilled' && !result.value).length;
      completedPages += results.length;
      await publishScanProgress(channel, { scan_id: job.scan_id, progress: Math.min(90, 10 + Math.round(completedPages / pages.length * 80)), current_step: 'page_analysis' });
      tasks.length = 0;
    }
  }

  if (tasks.length > 0) {
    const results = await Promise.allSettled(tasks);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Erreur de page parallèle :', result.reason);
      }
    });
    failedPages += results.filter((result) => result.status === 'fulfilled' && !result.value).length;
    completedPages += results.length;
    await publishScanProgress(channel, { scan_id: job.scan_id, progress: Math.min(90, 10 + Math.round(completedPages / pages.length * 80)), current_step: 'page_analysis' });
  }

  console.log(`[SCAN ${job.scan_id}] COMPLETE pages=${pages.length} duration_ms=${Date.now() - startedAt}`);
  try {
    await publishScanCompleted(channel, {
      scan_id: job.scan_id,
      pages_processed: pages.length + failedPages,
      pages_failed: failedPages,
      finished_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Impossible de publier scan.completed:', e);
  }
}

async function main() {
  const pool = new BrowserPoolManager(3);
  await pool.initialize();

  const channel = await connectQueue();

  await startConsuming(
    channel,
    (job) => processScanJob(job, pool, channel),
    (job, error) => publishScanFailed(channel, {
      scan_id: job.scan_id,
      failed_step: 'worker',
      error: error instanceof Error ? error.message : String(error),
      finished_at: new Date().toISOString(),
    }),
  );
  // start on-demand analysis consumer
  try {
    const { startAnalyzeConsumer } = await import('./queue-consumer/analyze-handler');
    await startAnalyzeConsumer(channel as any);
  } catch (e) {
    console.warn('Impossible de démarrer le consumer d\'analyse à la demande :', e);
  }

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