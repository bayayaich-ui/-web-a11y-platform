import './load-env';
import { connectQueue, closeQueue } from './queue-consumer/rabbitmq-connection';
import { startConsuming, ScanJob } from './queue-consumer/job-handler';
import { publishPageResult, publishScanCompleted } from './queue-consumer/result-publisher';
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
      const { diagnostic } = await service.genererDiagnostic(violationBrute);
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
) {
  const { page, context } = await pool.acquirePage();
  try {
    await page.goto(crawledPage.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 1. Détection des violations avec axe-core
    const axeResults = await runAxeScan(page);
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

    // 3. Calcul de la priorité (croisement axe-core + LLM) et tri
    const violationsTriees = prioriserViolations(violationsAvecDiagnostic);
    console.log(`[SCAN] Final violations: ${violationsTriees.length}`);

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
  } catch (error) {
    console.error(`Erreur lors du traitement de la page ${crawledPage.url}:`, error);
  } finally {
    await pool.releasePage(context);
  }
}

async function processScanJob(job: ScanJob, pool: BrowserPoolManager, channel: any) {
  console.log(`Démarrage du scan ${job.scan_id} pour ${job.url}`);

  const pages = await crawlSite(job.url, pool, {
    maxDepth: job.max_depth,
    maxPages: job.max_pages,
    scanMode: job.scan_mode ?? 'single_page',
  });

  const concurrency = pool.concurrency;
  const tasks: Promise<void>[] = [];

  for (const crawledPage of pages) {
    const task = processPage(crawledPage, job, pool, channel);
    tasks.push(task);

    if (tasks.length >= concurrency) {
      const results = await Promise.allSettled(tasks);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Erreur de page parallèle :', result.reason);
        }
      });
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
  }

  console.log(`Scan ${job.scan_id} terminé : ${pages.length} pages traitées`);
  try {
    publishScanCompleted(channel, {
      scan_id: job.scan_id,
      pages_processed: pages.length,
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

  await startConsuming(channel, (job) => processScanJob(job, pool, channel));
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